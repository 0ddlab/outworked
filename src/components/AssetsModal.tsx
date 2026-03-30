import { useEffect, useState } from "react";
import {
  type AssetPack,
  type FurnitureItemConfig,
  listAssetPacks,
  getActivePack,
  setActivePack,
  normalizeFurnitureItem,
  applyCustomFont,
  importAssetPack,
  openAssetsFolder,
  getAssetsReadme,
} from "../lib/assetPack";
import MarkdownMessage from "./MarkdownMessage";
import type { FurnitureItem } from "../phaser/OfficeScene";
// Static import for the builtin list — lazy-loaded to avoid pulling in Phaser
const BUILTIN_FURNITURE: { type: string; label: string; isDesk?: boolean }[] = [
  { type: "desk", label: "Desk", isDesk: true },
  { type: "plant", label: "Plant" },
  { type: "whiteboard", label: "Whiteboard" },
  { type: "bookshelf", label: "Bookshelf" },
  { type: "coffee-machine", label: "Coffee Machine" },
  { type: "water-cooler", label: "Water Cooler" },
  { type: "printer", label: "Printer" },
  { type: "filing-cabinet", label: "Filing Cabinet" },
  { type: "couch", label: "Couch" },
  { type: "standing-lamp", label: "Standing Lamp" },
  { type: "wall-clock", label: "Wall Clock" },
  { type: "coat-rack", label: "Coat Rack" },
  { type: "snack-machine", label: "Snack Machine" },
  { type: "cactus", label: "Cactus" },
  { type: "tv", label: "TV" },
  { type: "ping-pong", label: "Ping Pong" },
  { type: "trash-can", label: "Trash Can" },
  { type: "server-rack", label: "Server Rack" },
  { type: "fire-extinguisher", label: "Fire Extinguisher" },
  { type: "umbrella-stand", label: "Umbrella Stand" },
  { type: "mini-fridge", label: "Mini Fridge" },
  { type: "fan", label: "Fan" },
];
import { getSettingJSON } from "../lib/settings";

interface Props {
  onClose: () => void;
}

export default function AssetsModal({ onClose }: Props) {
  const [packs, setPacks] = useState<AssetPack[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"packs" | "furniture" | "info">("packs");
  const [placedCustom, setPlacedCustom] = useState<FurnitureItem[]>([]);
  const [readme, setReadme] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, a] = await Promise.all([listAssetPacks(), getActivePack()]);
      setPacks(p);
      setActiveId(a);
      // Load user-added furniture (both custom pack and added builtin) from saved layout
      const layout = await getSettingJSON<FurnitureItem[] | null>(
        "outworked_furniture_layout",
        null,
      );
      if (layout) {
        setPlacedCustom(
          layout.filter((f) => f.custom || f.id.startsWith("added-")),
        );
      }
      setLoading(false);
    })();
  }, []);

  const handleSelectPack = async (id: string | null) => {
    setActiveId(id);
    await setActivePack(id);
    // Apply custom font if the pack has one
    const pack = id ? (packs.find((p) => p.id === id) ?? null) : null;
    await applyCustomFont(pack);
    window.dispatchEvent(new Event("asset-pack-changed"));
  };

  const handleAddFurniture = (key: string, packId?: string) => {
    const eventKey = packId ? `${packId}:${key}` : key;
    window.dispatchEvent(
      new CustomEvent("furniture-add", { detail: { key: eventKey } }),
    );
    // Optimistically add to placed list
    setPlacedCustom((prev) => [
      ...prev,
      {
        id: `custom-${eventKey}-${Date.now()}`,
        type: key,
        x: 0,
        y: 0,
        custom: !!packId,
        customKey: packId ? eventKey : undefined,
        packId,
      },
    ]);
  };

  const handleRemoveFurniture = (id: string) => {
    window.dispatchEvent(
      new CustomEvent("furniture-remove", { detail: { id } }),
    );
    setPlacedCustom((prev) => prev.filter((f) => f.id !== id));
  };

  const w = window as unknown as { electronAPI?: { homedir?: string } };
  const home = w.electronAPI?.homedir ?? "~";

  // Collect furniture from ALL packs (not just active)
  const allPackFurniture: {
    packId: string;
    packName: string;
    entries: [string, FurnitureItemConfig & { desk: boolean }][];
  }[] = packs
    .filter((p) => p.manifest.categories.furniture)
    .map((p) => ({
      packId: p.id,
      packName: p.manifest.name,
      entries: Object.entries(p.manifest.categories.furniture!.items).map(
        ([key, entry]) =>
          [key, normalizeFurnitureItem(key, entry)] as [
            string,
            FurnitureItemConfig & { desk: boolean },
          ],
      ),
    }))
    .filter((p) => p.entries.length > 0);
  const hasFurniture = allPackFurniture.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-600 rounded-lg w-[460px] max-h-[80vh] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-pixel text-white">Assets</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm cursor-pointer font-pixel uppercase"
          >
            X
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setTab("packs")}
            className={`flex-1 py-2 text-[10px] font-pixel transition-colors cursor-pointer ${
              tab === "packs"
                ? "text-indigo-300 border-b-2 border-indigo-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sprite Packs
          </button>
          <button
            onClick={() => setTab("furniture")}
            className={`flex-1 py-2 text-[10px] font-pixel transition-colors cursor-pointer ${
              tab === "furniture"
                ? "text-indigo-300 border-b-2 border-indigo-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Furniture
          </button>
          <button
            onClick={() => {
              setTab("info");
              if (readme === null) {
                getAssetsReadme().then((md) => {
                  const idx = md.indexOf("<details>");
                  setReadme(idx >= 0 ? md.slice(0, idx).trimEnd() : md);
                });
              }
            }}
            className={`flex-1 py-2 text-[10px] font-pixel transition-colors cursor-pointer ${
              tab === "info"
                ? "text-indigo-300 border-b-2 border-indigo-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Info
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-[10px] font-pixel text-slate-400">Loading...</p>
          ) : tab === "packs" ? (
            /* ── Packs tab ── */
            <>
              <button
                onClick={() => handleSelectPack(null)}
                className={`w-full text-left p-3 rounded border transition-colors cursor-pointer ${
                  activeId === null
                    ? "border-indigo-500 bg-indigo-900/30"
                    : "border-slate-600 bg-slate-700/50 hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-pixel text-white">
                    Default (Procedural)
                  </span>
                  {activeId === null && (
                    <span className="text-[9px] font-pixel text-indigo-300">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Auto-generated pixel characters
                </p>
              </button>

              {packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleSelectPack(pack.id)}
                  className={`w-full text-left p-3 rounded border transition-colors cursor-pointer ${
                    activeId === pack.id
                      ? "border-indigo-500 bg-indigo-900/30"
                      : "border-slate-600 bg-slate-700/50 hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-pixel text-white">
                      {pack.manifest.name}
                    </span>
                    {activeId === pack.id && (
                      <span className="text-[9px] font-pixel text-indigo-300">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {pack.manifest.author && (
                      <span className="text-[10px] text-slate-400">
                        by {pack.manifest.author}
                      </span>
                    )}
                    {pack.manifest.version && (
                      <span className="text-[10px] text-slate-500">
                        v{pack.manifest.version}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    {pack.manifest.categories.employees && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-600 text-slate-300">
                        employees
                      </span>
                    )}
                    {pack.manifest.categories.furniture && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-600 text-slate-300">
                        furniture
                      </span>
                    )}
                    {pack.manifest.categories.background && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-600 text-slate-300">
                        background
                      </span>
                    )}
                    {pack.manifest.categories.font && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-600 text-slate-300">
                        font
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {packs.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-[10px] text-slate-400">
                    No custom packs found
                  </p>
                </div>
              )}

            </>
          ) : tab === "furniture" ? (
            /* ── Furniture tab ── */
            <>
              {/* Custom pack furniture — from all packs */}
              {hasFurniture &&
                allPackFurniture.map((packGroup) => (
                  <div key={packGroup.packId}>
                    <p className="text-[9px] font-pixel text-slate-500 uppercase mt-4">
                      {packGroup.packName}
                    </p>
                    <div className="space-y-1">
                      {packGroup.entries.map(([key, config]) => (
                        <div
                          key={`${packGroup.packId}:${key}`}
                          className="flex items-center justify-between p-2 rounded border border-slate-600 bg-slate-700/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white">{key}</span>
                            {config.desk && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                                desk
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleAddFurniture(key, packGroup.packId)
                            }
                            className="text-[9px] font-pixel px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Builtin furniture */}
              <p className="text-[9px] font-pixel text-slate-500 uppercase">
                Builtin
              </p>
              <div className="space-y-1">
                {BUILTIN_FURNITURE.map((b) => (
                  <div
                    key={b.type}
                    className="flex items-center justify-between p-2 rounded border border-slate-600 bg-slate-700/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white">{b.label}</span>
                      {b.isDesk && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                          desk
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddFurniture(b.type)}
                      className="text-[9px] font-pixel px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>

              {/* Placed custom furniture */}
              {placedCustom.length > 0 && (
                <>
                  <p className="text-[9px] font-pixel text-slate-500 uppercase mt-4">
                    In Office
                  </p>
                  <div className="space-y-2">
                    {placedCustom.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded border border-slate-600 bg-slate-700/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-300">
                            {item.customKey ?? item.type}
                          </span>
                          {item.isDesk && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                              desk
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveFurniture(item.id)}
                          className="text-[9px] font-pixel px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-red-100 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="border-t border-slate-700 pt-3 mt-3">
                <p className="text-[10px] text-slate-500">
                  Add PNGs to{" "}
                  <code className="text-slate-400">
                    {home}/.outworked/assets/{"<pack>"}/furniture/
                  </code>
                  . Files named <code className="text-slate-400">desk*</code>{" "}
                  are auto-detected as desks. Right-click to rotate in the
                  office.
                </p>
              </div>
            </>
          ) : (
            /* ── Info tab ── */
            <div className="text-[12px] text-slate-300 leading-relaxed">
              {readme === null ? (
                <span className="text-slate-500">Loading...</span>
              ) : (
                <MarkdownMessage content={readme} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="btn-pixel text-[11px] py-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer font-pixel"
          >
            OK
          </button>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const newId = await importAssetPack();
                if (newId) {
                  const updated = await listAssetPacks();
                  setPacks(updated);
                }
              }}
              className="btn-pixel text-[9px] py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded cursor-pointer font-pixel"
            >
              Import...
            </button>
            <button
              onClick={() => openAssetsFolder()}
              className="btn-pixel text-[9px] py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded cursor-pointer font-pixel"
            >
              Open Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
