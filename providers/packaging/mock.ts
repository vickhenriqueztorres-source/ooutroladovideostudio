import type{PackagingAdapter}from"../../core/contracts/packaging"

export class MockPackagingAdapter implements PackagingAdapter{
  constructor(private readonly contrastRatio=7.2,private readonly safeAreaValid=true,private readonly estimatedCtr=.074,private readonly paletteAdherence=.95){}
  buildThumbnailBrief(concept:string,overlayText:string){
    const stem=Buffer.from(`${concept}:${overlayText}`).toString("hex").slice(0,32)
    return{contrastRatio:overlayText.length?this.contrastRatio:0,safeAreaValid:this.safeAreaValid,legibilityScore:this.safeAreaValid?.96:.4,paletteAdherence:this.paletteAdherence,estimatedCtr:this.estimatedCtr,baseImageHash:`sha256:base-${stem}`,finalImageHash:`sha256:final-${stem}`,mobilePreviewHash:`sha256:mobile-${stem}`}
  }
}
