/**
 * Display validated terrain immediately, then enrich the existing scene
 * with optional floor colours. A slow/failed config request MUST NOT block
 * the core WebGL viewport or Travel controls.
 *
 * Returns a Promise for optional work, not a barrier to first paint.
 * isCurrent prevents stale async material results recolouring a newer region.
 * Optional neighbouring geometry loads alongside initial materials; its own
 * material pass includes halo IDs and takes precedence over the original pass.
 */
export function displayTerrainProgressively({
    terrain, renderTerrain, fetchMaterials, applyMaterials,
    onMaterialError, isCurrent = () => true,
    fetchNeighbours, applyNeighbours, onNeighbourError = () => {},
}) {
    if (typeof renderTerrain !== "function" ||
        typeof fetchMaterials !== "function" ||
        typeof applyMaterials !== "function" ||
        typeof onMaterialError !== "function" ||
        typeof isCurrent !== "function" ||
        fetchNeighbours&&(typeof fetchNeighbours!=="function"||typeof applyNeighbours!=="function") ||
        typeof onNeighbourError!=="function") {
        throw new TypeError("Invalid progressive world rendering callbacks");
    }
    if (!isCurrent()) return Promise.resolve();
    // Synchronous: WebGL geometry, loaded status, and Travel button
    // become usable before any floor-definition request is started.
    renderTerrain(terrain);
    let enriched=false;
    const materialsWork=Promise.resolve()
        .then(() => fetchMaterials(terrain))
        .then(materials => {
            if (isCurrent()&&!enriched) applyMaterials(terrain, materials);
        })
        .catch(error => {
            if (isCurrent()&&!enriched) onMaterialError(error);
        });
    if(!fetchNeighbours)return materialsWork;
    const neighbourWork=Promise.resolve()
        .then(()=>fetchNeighbours(terrain))
        .then(async scene=>{
            if(!scene||!isCurrent())return;
            enriched=true;
            applyNeighbours(scene);
            try{
                const materials=await fetchMaterials(scene);
                if(isCurrent())applyMaterials(scene,materials);
            }catch(error){if(isCurrent())onMaterialError(error);}
        })
        .catch(error=>{if(isCurrent())onNeighbourError(error);});
    return Promise.all([materialsWork,neighbourWork]);
}
