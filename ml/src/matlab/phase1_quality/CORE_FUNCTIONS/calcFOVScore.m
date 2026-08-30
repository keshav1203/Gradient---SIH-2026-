function [score, fovRatio] = calcFOVScore(mask)
% Checks the retina fills a reasonable portion of the frame and is not
% cropped off the image border.
    fovRatio = nnz(mask) / numel(mask);

    idealLow = 0.35; idealHigh = 0.85;
    if fovRatio >= idealLow && fovRatio <= idealHigh
        score = 1;
    else
        d = min(abs(fovRatio - idealLow), abs(fovRatio - idealHigh));
        score = max(0, 1 - d / 0.3);
    end

    borderPixels = [mask(1,:), mask(end,:), mask(:,1)', mask(:,end)'];
    borderFrac = mean(borderPixels);
    if borderFrac > 0.3
        score = score * 0.5;
    end
end
