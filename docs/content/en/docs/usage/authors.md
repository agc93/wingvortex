---
title: "Notes for Mod Authors"
linkTitle: "Mod Compatibility"
weight: 40
description: >
  How to make your mods Vortex-compatible
---

Despite common opinion on the matter, not **everyone** wants to manually install mods, no matter how easy _you_ find it to be. As such, making your mod compatible is _incredibly easy_ and _helps users_.

The most obvious way to make your mod incompatible is requiring manual steps like renaming files. In fact, if you use file renames to achieve this (things like `.pakx` files) users will see a warning recommending they not install the mod. If you have optional alternate files, just include them as separate downloads, or use an installer. Equally, don't use subfolders to try and force a load order: Vortex will flatten all mod files into one folder. Just use file names to get the same effect as UE4 loads files alphabetically.

> If you have a truly weird install scenario that needs something more than that, contact @agc93 first.