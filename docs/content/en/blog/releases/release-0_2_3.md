---
title: "Alpha 2.3 Release"
linkTitle: "Release 0.2.3"
date: 2021-07-22
aliases:
  - /updates/v0.2.3
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

This one's another minor update, mainly laying the groundwork for the upcoming Xbox Game Pass/Microsoft Store version of Project Wingman. 

Note that due to a [sort-of bug in Vortex](https://github.com/Nexus-Mods/Vortex/issues/9665) this version of WingVortex will only be available to users of Vortex 1.4.15 which (as of time of writing) is not actually released. Once the Vortex update is available the extension should auto-update. The previous 0.2.2 release will continue to be available for 1.4 users until the 1.4.15 update.

## WingVortex and the Microsoft Store

Vortex (after the 1.4.15 update) *should* support installing and deploying mods for the Microsoft Store version of Project Wingman, but this is **unsupported**. That means I'll try my best to keep it working, but I provide no guarantees, and I generally can't help you with debugging problems with the Microsoft Store version.

My recommendation for this game is simple: if you like Project Wingman and want to be able to mod your game without limits or hacks **buy it on Steam or GOG**.

## Changes

- Added experimental support for XGP/Microsoft Store installs
  - The existing setup process would fail for Microsoft Store installs due to missing permissions.
  - This *should* now be resolved and Vortex will work, admittedly only partially, using AppData to deploy mods
  - Modding tools (including PSM and the PSM integration) will **not** work with the XGP/MSS version.
  - Managing your load order in Vortex will **not** work with the XGP/MSS version.
- This version is still working off the major changes from v0.2.1 so please [report any bugs](https://github.com/agc93/wingvortex/issues) or [give feedback](https://www.nexusmods.com/site/mods/189?tab=posts).