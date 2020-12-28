---
title: "Alpha 0.3 Release"
linkTitle: "Release 0.0.3"
date: 2020-12-28
aliases:
  - /updates/v0.0.3
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the third alpha of the Project Wingman extension!

There's a bunch of updates to this version, some big and some quite small:

- DataTable Detection <sup>PREVIEW</sup>
  - I've enabled some very basic detection that will read your installed mod files and try to determine if more than one of them modifies datatables.
  - Data table modding is what allows for mods like Unreleased Planes, AoA for All and the Prez Everywhere System. You can only have one mod at a time that modifies the same table.
  - Vortex will now warn you if you deploy multiple mods that change the same data table.
- Minor fixes
  - No longer creates invalid state change handlers (thanks for the tip Tannin!)
  - Some other minor refactoring

You should be able to install mods for Project Wingman from Nexus Mods or external archives in this release and support the basic Vortex features of install/enable/disable/deploy/purge.