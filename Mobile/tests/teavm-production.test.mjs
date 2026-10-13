import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

// The production build uses the TeaVM Maven plugin, not the Gradle DSL.
// In 0.15.0 Maven's default optimization is SIMPLE; require an explicit
// ADVANCED setting for both the playable title bridge and whole-engine proof.
for(const name of ["pom.xml","engine-pom.xml"]){
    test(name+" uses production TeaVM JavaScript optimisation",()=>{
        const xml=readFileSync(new URL("../teavm-poc/"+name,import.meta.url),"utf8");
        const configuration=xml.match(/<configuration>([\s\S]*?)<\/configuration>/)?.[1];
        assert.ok(configuration,"TeaVM compiler configuration must be present");
        assert.match(configuration,/<targetType>JAVASCRIPT<\/targetType>/);
        assert.match(configuration,/<optimizationLevel>ADVANCED<\/optimizationLevel>/,
            "the TeaVM Maven 0.15.0 default is SIMPLE, unsuitable for production");
        assert.match(configuration,/<incremental>false<\/incremental>/);
        assert.match(configuration,/<minifying>true<\/minifying>/);
        assert.match(configuration,/<sourceMapsGenerated>false<\/sourceMapsGenerated>/);
    });
}
