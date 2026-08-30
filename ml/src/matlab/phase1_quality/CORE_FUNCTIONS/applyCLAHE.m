function Iout = applyCLAHE(I)
% Contrast Limited Adaptive Histogram Equalization on luminance only
% (preserves original color balance).
    lab = rgb2lab(I);
    L = lab(:,:,1) / 100;
    L_eq = adapthisteq(L, 'ClipLimit', 0.01, 'Distribution', 'rayleigh');
    lab(:,:,1) = L_eq * 100;
    Iout = lab2rgb(lab);
    Iout = min(max(Iout, 0), 1);
end
