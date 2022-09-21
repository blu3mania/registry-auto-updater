import * as url from 'url';
import path from 'path';
import notifier from 'node-notifier';

import {
    error,
    warning,
    info,
    verbose } from './print.js';
import { Registry } from './windows-registry.js';
import settings from './settings.json' assert {type: 'json'};

verbose('Starting...');

const TriggerType = {
    ValueChange: 'value change',
    Timer: 'timer',
};

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const registry = Registry.instance;
const monitorTokens = [];

main();

function main() {
    settings.updateSets.forEach((updateSet) => {
        updateSet.values.forEach((value) => {
            const updateValue = () => {
                return registry.setValue(value.key, value.name, value.value, Registry.ValueType[value.type]);
            };

            // First check if we have write permission on the key by setting its original value
            if (!updateValue()) {
                error(`Cannot obtain write permission on "${value.name}" of key "${value.key}", exiting...`);
                exitProcess();
            }

            if (updateSet.trigger?.toLowerCase() === TriggerType.ValueChange) {
                const monitorToken = registry.monitorValue(value.key, value.name, value.value, true, (key, currentValue, compareValue) => {
                    info(`UpdateSet "${updateSet.id}" triggered. Resetting value "${value.key}\\${value.name}"...`);
                    if (updateValue()) {
                        info(`Successfully reset value "${value.key}\\${value.name}".`);
                        if (settings.showNotification) {
                            sendDesktopNotification('Monitored Registry Value Changed', `UpdateSet "${updateSet.id}" triggered. Successfully reset value "${value.key}\\${value.name}".`, 'value-updated.png');
                        }
                    } else {
                        error(`Failed to update value "${value.key}\\${value.name}"!`);
                        if (settings.showNotification) {
                            sendDesktopNotification('Monitored Registry Value Changed', `UpdateSet "${updateSet.id}" triggered. Failed to update value "${value.key}\\${value.name}".`, 'value-update-failure.png');
                        }
                    }
                });
                monitorTokens.push(monitorToken);
            } else if (updateSet.trigger?.toLowerCase() === TriggerType.Timer) {
                setInterval(() => {
                    //info(`UpdateSet "${updateSet.id}" triggered. Updating value...`);
                    if (updateValue()) {
                        info(`Successfully reset value "${value.key}\\${value.name}".`);
                        if (settings.showNotification) {
                            sendDesktopNotification('Registry Value Monitor Timer Event', `UpdateSet "${updateSet.id}" triggered. Successfully reset value ${value.key}\\${value.name}.`, 'value-updated.png');
                        }
                    } else {
                        error(`Failed to update value "${value.key}\\${value.name}"!`);
                        if (settings.showNotification) {
                            sendDesktopNotification('Registry Value Monitor Timer Event', `UpdateSet "${updateSet.id}" triggered. Failed to update value "${value.key}\\${value.name}".`, 'value-update-failure.png');
                        }
                    }
                }, (updateSet.timer ?? 60) * 1000);
            }
        });
    });

    process.on('SIGINT', () => {
        warning('SIGINT received, exiting...');
        exitProcess();
    });
}

function exitProcess() {
    monitorTokens.forEach((token) => {
        token.stop();
        verbose(`Stopped monitoring ${token.tokenData.path}`);
    });
    process.exit();
}

function sendDesktopNotification(title, message, icon) {
    notifier.notify({
        title: title,
        message: message,
        appID: 'Update Dynamic DNS',
        icon: getImagePath(icon),
    });
}

function getImagePath(imageFile) {
    return path.join(__dirname, 'images', imageFile);
}
