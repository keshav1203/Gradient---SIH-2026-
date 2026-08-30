function [score, rmsContrast] = calcContrastScore(I, mask)
% RMS (standard deviation) contrast within the FOV.
    gray = rgb2gray(I);
    vals = gray(mask);
    rmsContrast = std(vals);

    threshLow  = 0.03;
    threshHigh = 0.18;
    score = min(max((rmsContrast - threshLow) / (threshHigh - threshLow), 0), 1);
end
