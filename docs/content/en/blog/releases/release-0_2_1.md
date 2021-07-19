---
title: "Alpha 2.1 Release"
linkTitle: "Release 0.2.1"
date: 2021-07-19
aliases:
  - /updates/v0.2.1
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

This one's a big update, both in terms of functionality and under the hood. Note that since we're using some of Vortex's newer bells and whistles now, this version will require Vortex **1.4** or higher. The previous 0.0.5 release will continue to be available for 1.3 users.

- [Project Sicario Merger](https://www.nexusmods.com/projectwingman/mods/270) integration!
  - The extension now includes built-in support for merging compatible mods with PSM.
  - Simply install PSM [from Nexus Mods](https://www.nexusmods.com/projectwingman/mods/270), enable it and turn on the PSM integration in Settings > Interface (or on the Dashboard)
  - Vortex will then run PSM after each deployment to update your merged mod with any PSM-compatible mods.
- Fixed a lot of smaller bugs and problems
  - There were a few errors that weren't being handled properly, but these should be improved.
  - Some smaller errors in logging and a race condition in the installer have also been isolated.
  - This one has been a pretty massive change behind-the-scenes so please [report any bugs](https://github.com/agc93/wingvortex/issues) or [give feedback](https://www.nexusmods.com/site/mods/189?tab=posts).

![PSM integration](https://i.imgur.com/AWyb7vX.gif)