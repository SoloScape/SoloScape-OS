import { NativeJs5Cache } from "./native-js5.mjs";

const cache = new NativeJs5Cache();
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
        const catalog = await cache.loadIndex(archive);
        selectedIndex = archive;
        groupInput.value = String(catalog.groups.keys().next().value);
        result.textContent = summary(catalog);
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
        const bytes = await cache.loadGroup(selectedIndex, id);
        groupResult.textContent = `Archive ${selectedIndex}, group ${id}: ${bytes.length.toLocaleString()} verified container bytes are now available in the browser's in-memory cache. Ready for decoder/renderer integration.`;
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
