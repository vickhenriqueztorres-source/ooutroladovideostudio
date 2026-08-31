import type{EditAssetRequest,EditShot,EditSoundIntent,EditTransitionPlan,ScriptPackage}from"../../core/contracts"
import{buildSoundIntentMap,buildTransitionPlan,compileEditBlueprint,createAssetRequests}from"../../core/edit-timeline"
export class MockEditTimelineCompiler{compile(input:ScriptPackage){return compileEditBlueprint(input)}}
export class MockTransitionPlanner{plan(shots:EditShot[]):EditTransitionPlan[]{return buildTransitionPlan(shots)}}
export class MockAssetPlanner{plan(shots:EditShot[]):EditAssetRequest[]{return createAssetRequests(shots)}}
export class MockSoundIntentPlanner{plan(shots:EditShot[]):EditSoundIntent[]{return buildSoundIntentMap(shots)}}
