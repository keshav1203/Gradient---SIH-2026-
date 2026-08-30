function Ienh = enhanceImage(I, mask, targetSize)
% Full enhancement chain producing a model-ready image:
%   resize -> illumination normalization -> CLAHE -> denoising ->
%   pixel normalization.
%
% Resizing FIRST (before the expensive filtering steps) is a deliberate
% performance choice: source fundus images can be very high resolution
% (e.g. ~4288x2848 for IDRiD), and CLAHE/denoising cost scales with
% pixel count. Since labels here are image-level (not spatial/bounding
% box), resizing early loses no label-relevant information and cuts
% runtime dramatically (~40x fewer pixels to filter for a 512x512 target).
    if nargin < 3 || isempty(targetSize)
        targetSize = [512 512];
    end

    I = im2double(I);

    Iresized = imresize(I, targetSize);
    maskResized = imresize(mask, targetSize, 'nearest');

    Inorm    = illuminationNormalize(Iresized, maskResized);
    Iclahe   = applyCLAHE(Inorm);
    Idenoise = denoiseImage(Iclahe);

    maskR = repmat(maskResized, 1, 1, 3);
    Idenoise(~maskR) = 0;

    Ienh = min(max(Idenoise, 0), 1);
end
