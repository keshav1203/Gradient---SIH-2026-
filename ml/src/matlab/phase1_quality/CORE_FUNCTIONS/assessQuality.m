function q = assessQuality(I, mask)
% Combines blur/illumination/contrast/FOV metrics into an overall score
% and a Good / Borderline / Poor decision.
    [blurScore, blurRaw]      = calcBlurScore(I, mask);
    [illumScore, meanI, unif] = calcIlluminationScore(I, mask);
    [contrastScore, rmsC]     = calcContrastScore(I, mask);
    [fovScore, fovRatio]      = calcFOVScore(mask);

    weights = [0.35, 0.25, 0.25, 0.15];  % blur, illumination, contrast, fov
    overall = weights * [blurScore; illumScore; contrastScore; fovScore];

    if overall >= 0.75
        decision = 'Good';
    elseif overall >= 0.5
        decision = 'Borderline';
    else
        decision = 'Poor';
    end

    q = struct('blurScore', blurScore, 'illumScore', illumScore, ...
        'contrastScore', contrastScore, 'fovScore', fovScore, ...
        'overallScore', overall, 'decision', decision, ...
        'meanIntensity', meanI, 'illumUniformity', unif, ...
        'rmsContrast', rmsC, 'fovRatio', fovRatio, 'blurRawVar', blurRaw);
end
