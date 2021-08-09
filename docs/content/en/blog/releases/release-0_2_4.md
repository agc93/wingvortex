---
title: "Alpha 2.4 Release"
linkTitle: "Release 0.2.4"
date: 2021-08-09
aliases:
  - /updates/v0.2.4
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

This one's another minor update, mainly better handling a few small bugs in the load order support. It was possible in the last version to write an invalid load order file and Vortex would then be "stuck" with that load order. While I'm still working on the cause of the bug itself, this update will at least allow you to recover from it more easily.

## Changes

- Added invalid load order recovery
  - This will prompt you if Vortex tries to load an invalid load order file and offer to reset it
  - This will reset your current load order!
  - If you're feeling helpful, send me the load order file _before_ you reset it to help find the culprit.
- This version is still working off the major changes from v0.2.1 so please [report any bugs](https://github.com/agc93/wingvortex/issues) or [give feedback](https://www.nexusmods.com/site/mods/189?tab=posts).