function [score, rawVar] = calcBlurScore(I, mask)
% Laplacian-variance based sharpness estimate. Higher variance = sharper.
%
% NOTE ON THRESHOLDS: these are heuristic defaults, not calibrated
% against a specific dataset. Real-world testing on IDRiD fundus images
% showed raw Laplacian variance clustering in a much lower/narrower
% range than a first guess would suggest - these values reflect that.
% If you have several example images you already know are sharp vs.
% blurry, compare their printed rawVar (2nd output) against these
% thresholds and adjust threshLow/threshHigh accordingly.
    gray = rgb2gray(I);
    lap = fspecial('laplacian', 0.2);
    response = imfilter(gray, lap, 'replicate');
    rawVar = var(response(mask));

    threshLow  = 0.00005;   % near-uniform response -> very blurry
    threshHigh = 0.0015;    % strong edge response -> sharp
    score = min(max((rawVar - threshLow) / (threshHigh - threshLow), 0), 1);
end
