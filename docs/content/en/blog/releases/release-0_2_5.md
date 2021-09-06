---
title: "Alpha 2.5 Release"
linkTitle: "Release 0.2.5"
date: 2021-09-05
aliases:
  - /updates/v0.2.5
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

This one's another minor update, adding support for detecting embedded Project Sicario presets/requests. This will mostly make it clearer which data table conflicts can be resolved with Project Sicario and which ones are not compatible.

## Changes

- Added detection for embedded Sicario presets and request files
  - This will detect any Sicario presets or request files embedded in mods you install, just like skins.
  - This also means that the dialog shown when there is a data table conflict will now show mods that include Sicario patches
- This version is still working off the major changes from v0.2.1 so please [report any bugs](https://github.com/agc93/wingvortex/issues) or [give feedback](https://www.nexusmods.com/site/mods/189?tab=posts).