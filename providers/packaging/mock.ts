import type{PackagingAdapter}from"../../core/contracts/packaging"

export class MockPackagingAdapter implements PackagingAdapter{
  constructor(private readonly contrastRatio=7.2,private readonly safeAreaValid=true){}
  buildThumbnailBrief(_concept:string,overlayText:string){
    return{contrastRatio:overlayText.length?this.contrastRatio:0,safeAreaValid:this.safeAreaValid}
  }
}
