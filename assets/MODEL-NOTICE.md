# BMW M5 CS model provenance

This asset was converted locally from the user's `22m5/dlc.rpf`, approved as the final car model. The original source archive has not been modified.

- Source SHA-256: `0c89fb9533806dcc917d08030f315b314a1f9fae27d246879655b43268d9ec8e`
- Mesh resource: `22m5.yft` (identical to `22m5_hi.yft` in this archive).
- Texture resource: `22m5.ytd`.
- Export: GLB 2.0 with embedded PNG textures and named wheel nodes.
- Conversion retains source geometry; the duplicate inner glass layer is omitted and one double-sided pane is rendered. The source wheel mesh is instanced at all four wheel pivots. GTA-specific material effects are adapted to browser PBR, with green paint and bronze trim matching the requested appearance.

The archive did not supply an independently verified redistribution license or author attribution. This conversion does not grant new rights to the source mesh, textures or trademarks. Confirm permission from the asset's rights holder before distributing the model or publishing a game containing it. This is not an official BMW product. The supplied reference photograph is not redistributed.

The custom format reader was written using the public RPF/RSC structure definitions in [CodeWalker](https://github.com/dexyfex/CodeWalker/tree/master/CodeWalker.Core/GameFiles/Resources), principally `Drawable.cs`, `Texture.cs` and `Frag.cs`. No game encryption keys, proprietary import utilities or source game binaries are bundled.

Three.js is bundled under the MIT license; see `../THREE-LICENSE.txt`.
