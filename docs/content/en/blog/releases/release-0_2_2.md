---
title: "Alpha 2.2 Release"
linkTitle: "Release 0.2.2"
date: 2021-07-21
aliases:
  - /updates/v0.2.2
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

This one's a minor fix update, building on the new PSM integration introduced in the [previous update](/updates/v0.2.1). Note that since we're using some of Vortex's newer bells and whistles now, this version will require Vortex **1.4** or higher. The previous 0.0.5 release will continue to be available for 1.3 users.

- [Project Sicario Merger](https://www.nexusmods.com/projectwingman/mods/270) integration should be more reliable
  - The PSM integration introduced in the last update could sometimes fail to detect PSM even if it was installed
  - We're now a lot more forgiving about detecting PSM and will find it more reliably
  - If you're still hitting issues with Vortex failing to find PSM, please let me know!
- Fixed a few other smaller bugs and problems
  - There were a few errors that weren't being handled properly, but these should be improved.
  - The load order window now has (a tiny bit) extra detail
  - This version is still working off the major changes from v0.2.1 so please [report any bugs](https://github.com/agc93/wingvortex/issues) or [give feedback](https://www.nexusmods.com/site/mods/189?tab=posts).

![PSM integration](https://i.imgur.com/AWyb7vX.gif)