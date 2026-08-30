function [score, meanI, uniformity] = calcIlluminationScore(I, mask)
% Scores mean brightness (ideal mid-range) and spatial uniformity.
    gray = rgb2gray(I);
    vals = gray(mask);
    meanI = mean(vals);

    idealLow = 0.25; idealHigh = 0.75;
    if meanI >= idealLow && meanI <= idealHigh
        meanScore = 1;
    else
        d = min(abs(meanI - idealLow), abs(meanI - idealHigh));
        meanScore = max(0, 1 - d / 0.25);
    end

    blockSize = max(8, round(size(gray,1) / 8));
    blockMeans = blockproc(gray, [blockSize blockSize], @(b) mean(b.data(:)));
    uniformity = std(blockMeans(:));
    uniScore = max(0, 1 - uniformity / 0.15);

    score = 0.6 * meanScore + 0.4 * uniScore;
end
