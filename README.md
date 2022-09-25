# registry-auto-updater
[![Apache 2.0 License](https://img.shields.io/badge/License-Apache%202.0-yellow)](https://raw.githubusercontent.com/blu3mania/registry-auto-updater/main/LICENSE)
[![node.js 17+](https://img.shields.io/badge/node.js-17.0.0-blue?logo=node.js)](https://nodejs.org/en/)
[![Latest Release](https://img.shields.io/github/v/release/blu3mania/registry-auto-updater)](https://github.com/blu3mania/registry-auto-updater/releases/latest)

Automatically update registry values based on trigger or timer.

It can be run as a standalone application or as a Windows service.

## Run these steps first:

1. One of the packages, "ffi-napi", uses native modules and relies on "node-gyp" to build the project. As a
   result, there are some prerequisites that need to be installed/configured. Please refer to [node-gyp's
   instructions](https://github.com/nodejs/node-gyp#installation).
2. Edit src/settings.json.
   * service defines service parameters when installed as Windows service:
     * name is the service name to be used.
     * account info is optional. If provided, the service will be running as the specified account. These properties
       can be provided:
       * name is account's name
       * password is account's password
       * domain is optional, and should be provided if the account is a domain account
   ```
    "service": {
        "name": "Registry Auto Updater",
        "account": {
            "name": "{account name}",
            "password": "{account password}",
            "domain": "{account domain}"
        }
    },
   ```
   * showNotification allows showing Windows notification when an action is taken, such as domain is updated
     in provider, or domain update is queued (due to update interval).

     **Note**, this only works when running in standalone mode instead of a Windows service.
   * logging determines whether registry API errors will be logged to console. It helps with initial investigation
     but might become too spamming when there are expected errors, especially when other applications delete the
     keys/values this app is motioning.
   * updateSets defines the registry keys/values to monitor/update. It is an array, and each item has the following
     properties:
     * id is a string identifier used for display, so it is clear which update set is triggered when event happens
     * trigger defines the type of trigger used to update the value. Supported values are: "Value Change", "Timer".
       If possible, "Value Change" should be used as it automatically detects change of value in teh registry and
       resets it back to the defined value.
     * timer defines the update interval when trigger type is "Timer". The value is in seconds. If not provided,
       default value 60 seconds is used.
     * values defines registry keys/values to monitor/update for the given update set.
       * key is the path to the registry key. It needs to start with one of the predefined root keys. For root key,
         both long and short terms are accepted. E.g. HKEY_LOCAL_MACHINE and HKLM.
      * name is the name of the value to be monitored/updated.
      * value is the value to be updated to. Its type is determined by the type defined in teh registry:
        * REG_DWORD & REG_QWORD: integer number
        * REG_SZ & REG_EXPAND_SZ: string
        * REG_MULTI_SZ: array of strings
        * REG_BINARY: not supported

        Unicode characters are supported for string types. See example below.
      * type is optional, as the code can detect it from current key value. However, it is strongly recommended, in
        case the key path/name doesn't exist in the registry.
   ```
    "updateSets": [
        {
            "id": "Interactive logon: Do not require CTRL+ALT+DEL",
            "trigger": "Value Change",
            "values": [
                {
                    "key": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System",
                    "name": "DisableCAD",
                    "value": 1,
                    "type": "REG_DWORD"
                },
                {
                    "key": "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon",
                    "name": "DisableCAD",
                    "value": 1
                }
            ]
        },
        {
            "id": "Types Example",
            "trigger": "Timer",
            "timer": 30,
            "values": [
                {
                    "key": "HKLM\\SOFTWARE\\Some Company\\Some Product\\Some Key",
                    "name": "DWORD Value",
                    "value": 4294967295,
                    "type": "REG_DWORD"
                },
                {
                    "key": "HKLM\\SOFTWARE\\Some Company\\Some Product\\Some Key",
                    "name": "QWORD Value",
                    "value": 42949672950000,
                    "type": "REG_QWORD"
                },
                {
                    "key": "HKLM\\SOFTWARE\\Some Company\\Some Product\\Some Key",
                    "name": "A String",
                    "value": "Some string",
                    "type": "REG_SZ"
                },
                {
                    "key": "HKLM\\SOFTWARE\\Some Company\\Some Product\\Some Key",
                    "name": "An Expandable Path",
                    "value": "%SystemRoot%\\System32\\SomeBinary.exe",
                    "type": "REG_EXPAND_SZ"
                },
                {
                    "key": "HKLM\\SOFTWARE\\Some Company\\Some Product\\Some Key",
                    "name": "List of Strings",
                    "value": [
                      "First string value",
                      "Second string value",
                      "Unicode string 🧑‍💻😮‍💨😵‍💫🥴",
                      "Last string value"
                    ],
                    "type": "REG_MULTI_SZ"
                },
            ]
        }
   ```
3. Run "npm install". Accept UAC prompts if any (there could be up to 4).

   **Notes**
   - this step installs the script as a Windows service. If it's not desired, run "npm run uninstall"
     afterwards.
   - It seems node.js 16.x doesn't always work due to V8 change that enforced one-to-one mapping of Buffers
     and backing stores (see https://monorail-prod.appspot.com/p/v8/issues/detail?id=9908). It might crash
     like this:
     ```
      #
      # Fatal error in , line 0
      # Check failed: result.second.
      #
      #
      #
      #FailureMessage Object: 000000A5C1FFE530
      1: 00007FF6B7E1B1EF v8::internal::CodeObjectRegistry::~CodeObjectRegistry+123599
      2: 00007FF6B7D37E7F std::basic_ostream<char,std::char_traits<char> >::operator<<+65407
      3: 00007FF6B8A14482 V8_Fatal+162
      4: 00007FF6B847EC6D v8::internal::BackingStore::Reallocate+637
      5: 00007FF6B86C81D9 v8::ArrayBuffer::GetBackingStore+137
      6: 00007FF6B7DEAD29 napi_get_typedarray_info+393
      7: 00007FF9D7298828
      8: 00007FF9D7299F88
      9: 00007FF9D72997CF
      10: 00007FF9D729F786
      11: 00007FF9D7298063
      12: 00007FF9D729EFB3
      13: 00007FF6B7DE54EB node::Stop+32747
      14: 00007FF6B86FE5EF v8::internal::SetupIsolateDelegate::SetupHeap+53823
      15: 000001BD57A7603B
     ```

     There have been several issues reported against node.js (e.g. https://github.com/nodejs/node/issues/32463)
     and ffi-napi (e.g. https://github.com/node-ffi-napi/node-ffi-napi/issues/188). Even though one of the
     reported issues claimed that it was fixed in node.js 16.17.0, the aforementioned crash could still be
     encountered. It seems node.js 18.9.0 is quite stable. For now this package is marked as requiring node.js
     17+, but the recommendation is to use the newest 18.x.


## To run the script manually:

Run "npm start" or "node src/app.js".

## To install and run the script as a Windows service:

Run "npm run install" or "node src/install-service.js". Accept UAC prompts if any (there could be up to 4).

**Note**, if settings.json is updated when service is running, restart it in Windows Services control panel.

## To uninstall the Windows service:

Run "npm run uninstall" or "node src/uninstall-service.js". Accept UAC prompts if any (there could be up to 4).