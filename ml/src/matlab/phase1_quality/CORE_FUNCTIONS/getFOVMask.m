function mask = getFOVMask(I)
% GETFOVMASK  Robust FOV mask for retinal/fundus video frames.
%
%   mask = getFOVMask(I)
%
%   Detects the visible retinal field-of-view while rejecting the
%   surrounding black background.
%
%   Designed for:
%       - Fundus photographs
%       - Retinal examination video frames
%       - Smartphone/portable fundus cameras
%
%   Output:
%       mask - logical binary mask, same height/width as input image
%
%   Processing:
%       1. Convert to grayscale
%       2. Estimate background using brightness
%       3. Threshold relative to image statistics
%       4. Keep the largest connected region
%       5. Fill internal holes
%       6. Smooth the boundary
%       7. Reject implausibly small detections
%       8. Use safe fallback when detection fails

    % ---------------------------------------------------------------
    % 1. Validate input
    % ---------------------------------------------------------------
    if isempty(I)
        mask = [];
        return;
    end

    if size(I,3) == 3
        gray = rgb2gray(I);
    elseif size(I,3) == 1
        gray = I;
    else
        gray = rgb2gray(I(:,:,1:3));
    end

    gray = im2double(gray);

    [H, W] = size(gray);
    imageArea = H * W;

    % ---------------------------------------------------------------
    % 2. Normalize grayscale image
    % ---------------------------------------------------------------
    gMin = min(gray(:));
    gMax = max(gray(:));

    if gMax > gMin
        grayNorm = (gray - gMin) / (gMax - gMin);
    else
        mask = true(H, W);
        return;
    end

    % ---------------------------------------------------------------
    % 3. Estimate dark background
    %
    % Fundus video frames often have a dark/black region around the
    % circular retinal FOV.
    % ---------------------------------------------------------------
    lowPercentile = simplePercentile(grayNorm, 10);
    highPercentile = simplePercentile(grayNorm, 90);

    % Adaptive threshold between dark background and retinal region.
    %
    % The 0.20 factor makes the detector less aggressive than the
    % original "graythresh * 0.5" approach.
    threshold = lowPercentile + ...
        0.20 * (highPercentile - lowPercentile);

    threshold = max(threshold, 0.04);
    threshold = min(threshold, 0.30);

    mask = grayNorm > threshold;

    % ---------------------------------------------------------------
    % 4. Remove small isolated regions
    % ---------------------------------------------------------------
    minArea = max(round(0.01 * imageArea), 500);

    mask = bwareaopen(mask, minArea);

    % ---------------------------------------------------------------
    % 5. Keep the largest connected component
    % ---------------------------------------------------------------
    components = bwconncomp(mask);

    if components.NumObjects == 0
        mask = fallbackMask(H, W);
        return;
    end

    componentSizes = cellfun(@numel, components.PixelIdxList);
    [largestSize, largestIdx] = max(componentSizes);

    mask = false(H, W);
    mask(components.PixelIdxList{largestIdx}) = true;

    % ---------------------------------------------------------------
    % 6. Fill holes inside the retinal FOV
    % ---------------------------------------------------------------
    mask = imfill(mask, 'holes');

    % ---------------------------------------------------------------
    % 7. Smooth the boundary
    %
    % This is important for video frames because compression,
    % reflections and illumination changes can make the raw boundary
    % jagged.
    % ---------------------------------------------------------------
    mask = imclose(mask, strel('disk', 12));

    mask = imopen(mask, strel('disk', 5));

    % Fill any holes introduced by morphology.
    mask = imfill(mask, 'holes');

    % ---------------------------------------------------------------
    % 8. Keep only the largest component again
    % ---------------------------------------------------------------
    components = bwconncomp(mask);

    if components.NumObjects > 1
        componentSizes = cellfun(@numel, components.PixelIdxList);
        [~, largestIdx] = max(componentSizes);

        cleanMask = false(H, W);
        cleanMask(components.PixelIdxList{largestIdx}) = true;
        mask = cleanMask;
    end

    % ---------------------------------------------------------------
    % 9. Reject implausibly small FOV
    % ---------------------------------------------------------------
    areaRatio = nnz(mask) / imageArea;

    if largestSize < 0.05 * imageArea || areaRatio < 0.10
        mask = fallbackMask(H, W);
        return;
    end

    % ---------------------------------------------------------------
    % 10. Protect against extremely thin / fragmented detections
    % ---------------------------------------------------------------
    stats = regionprops(mask, ...
        'Area', 'BoundingBox', 'MajorAxisLength', 'MinorAxisLength');

    if isempty(stats)
        mask = fallbackMask(H, W);
        return;
    end

    bb = stats(1).BoundingBox;

    bboxWidthRatio  = bb(3) / W;
    bboxHeightRatio = bb(4) / H;

    % If the detected region occupies only a small strip of the frame,
    % it is probably a failed FOV detection.
    if bboxWidthRatio < 0.25 || bboxHeightRatio < 0.25
        mask = fallbackMask(H, W);
        return;
    end

    % ---------------------------------------------------------------
    % 11. Final cleanup
    % ---------------------------------------------------------------
    mask = imfill(mask, 'holes');

end


% =====================================================================
% FALLBACK MASK
% =====================================================================
function mask = fallbackMask(H, W)
% Conservative fallback when automatic FOV detection fails.
%
% Instead of returning an empty mask, use a large central elliptical
% region. This avoids destroying the retinal image.

    [X, Y] = meshgrid(1:W, 1:H);

    cx = (W + 1) / 2;
    cy = (H + 1) / 2;

    rx = 0.47 * W;
    ry = 0.47 * H;

    mask = ((X - cx).^2 / rx^2 + ...
            (Y - cy).^2 / ry^2) <= 1;

    mask = logical(mask);
end


% =====================================================================
% SIMPLE PERCENTILE
% =====================================================================
function p = simplePercentile(x, pct)

    x = sort(x(:));

    n = numel(x);

    if n == 0
        p = NaN;
        return;
    end

    idx = max(1, min(n, round(pct / 100 * n)));

    p = x(idx);
end