/**
 * Display validated terrain immediately, then enrich the existing scene
 * with optional floor colours. A slow/failed config request MUST NOT block
 * the core WebGL viewport or Travel controls.
 *
 * Returns a Promise for optional work, not a barrier to first paint.
 * isCurrent prevents stale async material results recolouring a newer region.
 */
export function displayTerrainProgressively({
    terrain, renderTerrain, fetchMaterials, applyMaterials,
    onMaterialError, isCurrent = () => true,
}) {
    if (typeof renderTerrain !== "function" ||
        typeof fetchMaterials !== "function" ||
        typeof applyMaterials !== "function" ||
        typeof onMaterialError !== "function" ||
        typeof isCurrent !== "function") {
        throw new TypeError("Invalid progressive world rendering callbacks");
    }
    if (!isCurrent()) return Promise.resolve();
    // Synchronous: WebGL geometry, loaded status, and Travel button
    // become usable before any floor-definition request is started.
    renderTerrain(terrain);
    return Promise.resolve()
        .then(() => fetchMaterials(terrain))
        .then(materials => {
            if (isCurrent()) applyMaterials(terrain, materials);
        })
        .catch(error => {
            if (isCurrent()) onMaterialError(error);
        });
}
