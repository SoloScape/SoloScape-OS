import { NativeJs5Cache } from "./native-js5.mjs";
import { TspsCacheStoreAdapter } from "./tsps-cache-store.mjs";
import { drawIndexedSprite, loadFirstSprite } from "./sprite-preview.mjs";

const cache = new NativeJs5Cache();
const store = new TspsCacheStoreAdapter(cache);
const el = id => document.getElementById(id);
const indexInput = el("archive");
const groupInput = el("group");
const indexButton = el("load-index");
const groupButton = el("load-group");
const result = el("catalog");
const groupResult = el("group-result");
let selectedIndex = null;

const setBusy = busy => {
    indexButton.disabled = busy;
    groupButton.disabled = busy || selectedIndex === null;
};
const summary = (catalog) => {
    const ids = [...catalog.groups.keys()];
    return `Connected to revision ${cache.revision} JS5 cache.
Index ${catalog.index}: reference revision ${catalog.revision}.
${ids.length.toLocaleString()} groups in catalog; first ${ids[0]}, last ${ids.at(-1)}.
Master index contains ${cache.master.length} archives.
Group bytes are loaded only on demand.`;
};
indexButton.addEventListener("click", async () => {
    selectedIndex = null;
    setBusy(true);
    result.textContent = "Opening native JS5 connection and validating archive metadata…";
    groupResult.textContent = "Load a catalog first.";
    try {
        const archive = Number(indexInput.value);
        await store.preloadIndex(archive);
        const catalog = cache.indices.get(archive);
        const referenceBytes = store.read(255, archive);
        selectedIndex = archive;
        groupInput.value = String(catalog.groups.keys().next().value);
        result.textContent = summary(catalog) +
            `\nTSPS CacheStore.read(255, ${archive}): ${referenceBytes.length.toLocaleString()} signed bytes prepared.`;
    } catch (error) {
        result.textContent = "Cache loading failed: " + error.message;
    } finally {
        setBusy(false);
    }
});
groupButton.addEventListener("click", async () => {
    setBusy(true);
    groupResult.textContent = "Fetching and verifying native cache group…";
    try {
        const id = Number(groupInput.value);
        await store.preloadGroup(selectedIndex, id);
        const bytes = store.read(selectedIndex, id);
        groupResult.textContent = `Archive ${selectedIndex}, group ${id}: ${bytes.length.toLocaleString()} verified container bytes now available as Int8Array via TSPS-compatible CacheStore.read(${selectedIndex}, ${id}). No renderer is attached yet.`;
    } catch (error) {
        groupResult.textContent = "Group loading failed: " + error.message;
    } finally {
        setBusy(false);
    }
});
indexInput.addEventListener("input", () => {
    selectedIndex = null;
    groupButton.disabled = true;
});

const spriteButton = el("render-sprite");
const spriteResult = el("sprite-result");
const spriteCanvas = el("sprite-canvas");
spriteButton.addEventListener("click", async () => {
    spriteButton.disabled = true;
    spriteResult.textContent = "Selecting an archive-8 single-file sprite from the verified SoloScape catalog…";
    spriteCanvas.hidden = true;
    try {
        const graphic = await loadFirstSprite(cache, { maxAttempts: 8 });
        drawIndexedSprite(spriteCanvas, graphic.frame);
        spriteCanvas.hidden = false;
        spriteResult.textContent = `Rendered real SoloScape sprite! Archive ${graphic.archive}, group ${graphic.group}, file ${graphic.fileId}. Frame 1/${graphic.frameCount}, ${graphic.frame.sheetWidth}×${graphic.frame.sheetHeight} sheet; ${graphic.decodedBytes.toLocaleString()} decoded bytes. This Canvas image is not yet the TSPS 3D game renderer.`;
    } catch (error) {
        spriteResult.textContent = "Sprite renderer: " + error.message;
    } finally {
        spriteButton.disabled = false;
    }
});
