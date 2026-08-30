function process_video_for_prediction(videoPath, outputFolder, frameStep, windowSeconds)
% PROCESS_VIDEO_FOR_PREDICTION
%   Extracts frames from a doctor-uploaded retinal exam video, scores
%   each sampled frame for quality (blur/illumination/contrast/FOV),
%   classifies it as Good/Borderline/Poor (self-calibrated to THIS
%   video's own frames via percentile + Otsu thresholding - no dataset
%   needed), enhances it, and produces:
%       - one representative (best) frame per windowSeconds-long chunk
%         of video -> accepted_frames/  (feed these to the model)
%       - the single BEST frame across the entire video, highlighted
%         separately -> best_overall_frame/
%       - all Poor frames archived, not deleted -> rejected_frames/
%       - a histogram + a labeled review montage, so you can VISUALLY
%         verify the automatic Good/Borderline/Poor calls actually look
%         right before trusting them
%
%   USAGE:
%       process_video_for_prediction('exam1.mp4', 'video_output')
%       process_video_for_prediction('exam1.mp4', 'video_output', 5, 1)
%
%   INPUTS:
%       videoPath     - path to the video file
%       outputFolder  - where all output goes
%       frameStep     - process every Nth raw frame (default 5)
%       windowSeconds - "pick the best frame" window length in seconds
%                       (default 1 = one best frame per second)
%
%   OUTPUT:
%       outputFolder/accepted_frames/*.png
%       outputFolder/best_overall_frame/*.png
%       outputFolder/rejected_frames/*.png
%       outputFolder/frame_quality_report.csv
%       outputFolder/overallscore_histogram.png   <- CHECK THIS
%       outputFolder/quality_review_montage.png   <- AND THIS
%
%   Requires: Image Processing Toolbox. VideoReader support for your
%   video's codec (on Linux this depends on GStreamer plugins - if
%   VideoReader errors on file open, that's usually why).

    if nargin < 3 || isempty(frameStep),     frameStep = 5;     end
    if nargin < 4 || isempty(windowSeconds), windowSeconds = 1; end

    if ~exist(outputFolder, 'dir'), mkdir(outputFolder); end
    keepDir = fullfile(outputFolder, 'accepted_frames');
    bestDir = fullfile(outputFolder, 'best_overall_frame');
    rejectDir = fullfile(outputFolder, 'rejected_frames');
    if ~exist(keepDir, 'dir'), mkdir(keepDir); end
    if ~exist(bestDir, 'dir'), mkdir(bestDir); end
    if ~exist(rejectDir, 'dir'), mkdir(rejectDir); end

    % ---------- PASS 1: sample frames, compute raw quality metrics ----------
    v = VideoReader(videoPath); %#ok<TNMLP>
    frameRate = v.FrameRate;
    frameIdx = 0;
    blurRaw = []; illumScore = []; contrastScore = []; fovScore = [];
    sampledFrameIdx = [];

    fprintf('Pass 1/2: scanning "%s" (every %d-th frame, %.2f fps)...\n', ...
        videoPath, frameStep, frameRate);
    while hasFrame(v)
        frame = readFrame(v);
        frameIdx = frameIdx + 1;
        if mod(frameIdx, frameStep) ~= 0
            continue;
        end
        I = im2double(frame);
        if size(I,3) == 1
            I = cat(3, I, I, I);
        elseif size(I,3) == 4
            I = I(:,:,1:3);
        end
        mask = getFOVMask(I);
        [~, br] = calcBlurScore(I, mask);
        isScore = calcIlluminationScore(I, mask);
        csScore = calcContrastScore(I, mask);
        fsScore = calcFOVScore(mask);

        sampledFrameIdx(end+1) = frameIdx; %#ok<AGROW>
        blurRaw(end+1)         = br;       %#ok<AGROW>
        illumScore(end+1)      = isScore;  %#ok<AGROW>
        contrastScore(end+1)   = csScore;  %#ok<AGROW>
        fovScore(end+1)        = fsScore;  %#ok<AGROW>
    end

    numFrames = numel(sampledFrameIdx);
    fprintf('Sampled %d frames.\n', numFrames);
    if numFrames == 0
        error('No frames sampled - check frameStep or the video file.');
    end

    % ---------- Self-calibrate blur + decision thresholds from THIS video ----------
    loP = simplePercentile(blurRaw, 5);
    hiP = simplePercentile(blurRaw, 95);
    if hiP <= loP, hiP = loP + eps; end
    weights = [0.35, 0.25, 0.25, 0.15];  % blur, illumination, contrast, fov
    blurScore = min(max((blurRaw - loP) / (hiP - loP), 0), 1);
    overallScore = weights(1)*blurScore + weights(2)*illumScore + ...
        weights(3)*contrastScore + weights(4)*fovScore;

    if numFrames >= 3
        otsuLevels = multithresh(overallScore, 2);
        lowCut = otsuLevels(1); highCut = otsuLevels(2);
    else
        lowCut = 0.4; highCut = 0.7;  % fallback for very short clips
    end

    decision = cell(1, numFrames);
    for i = 1:numFrames
        if overallScore(i) > highCut
            decision{i} = 'Good';
        elseif overallScore(i) > lowCut
            decision{i} = 'Borderline';
        else
            decision{i} = 'Poor';
        end
    end

    % ---------- Best frame per window ----------
    isRepresentative = false(1, numFrames);
    windowFrameCount = max(1, round(windowSeconds * frameRate));
    windowId = floor((sampledFrameIdx - 1) / windowFrameCount) + 1;
    uniqueWindows = unique(windowId);
    for w = uniqueWindows
        inWindow = find(windowId == w & ~strcmp(decision, 'Poor'));
        if isempty(inWindow)
            continue;
        end
        [~, bestLocal] = max(overallScore(inWindow));
        isRepresentative(inWindow(bestLocal)) = true;
    end
    fprintf('%d windows (%gs each) -> %d representative frame(s) selected.\n', ...
        numel(uniqueWindows), windowSeconds, sum(isRepresentative));

    % ---------- Single best frame across the whole video ----------
    nonPoorIdx = find(~strcmp(decision, 'Poor'));
    isBestOverall = false(1, numFrames);
    if ~isempty(nonPoorIdx)
        [~, bestGlobalLocal] = max(overallScore(nonPoorIdx));
        isBestOverall(nonPoorIdx(bestGlobalLocal)) = true;
    end

    % ---------- PASS 2: re-read video, enhance + save selected frames ----------
    v2 = VideoReader(videoPath); %#ok<TNMLP>
    frameIdx2 = 0;
    sampleCounter = 0;
    fprintf('Pass 2/2: enhancing and saving frames...\n');
    while hasFrame(v2)
        frame = readFrame(v2);
        frameIdx2 = frameIdx2 + 1;
        if mod(frameIdx2, frameStep) ~= 0
            continue;
        end
        sampleCounter = sampleCounter + 1;

        d = decision{sampleCounter};
        rep = isRepresentative(sampleCounter);
        isBest = isBestOverall(sampleCounter);

        if ~rep && ~strcmp(d, 'Poor')
            continue;  % redundant duplicate within its window, skip saving
        end

        I = im2double(frame);
        if size(I,3) == 1
            I = cat(3, I, I, I);
        elseif size(I,3) == 4
            I = I(:,:,1:3);
        end
        mask = getFOVMask(I);
        Ienh = enhanceImage(I, mask);

        frameLabel = sprintf('frame_%05d', sampledFrameIdx(sampleCounter));
        if strcmp(d, 'Poor')
            imwrite(Ienh, fullfile(rejectDir, [frameLabel '_poor.png']));
        else
            imwrite(Ienh, fullfile(keepDir, [frameLabel '_' lower(d) '.png']));
            if isBest
                imwrite(Ienh, fullfile(bestDir, [frameLabel '_BEST.png']));
            end
        end
    end

    % ---------- Report ----------
    FrameNumber       = sampledFrameIdx(:);
    BlurScore         = blurScore(:);
    IlluminationScore = illumScore(:);
    ContrastScore     = contrastScore(:);
    FOVScore          = fovScore(:);
    OverallScore      = overallScore(:);
    Decision          = decision(:);
    Representative    = isRepresentative(:);
    IsBestOverall     = isBestOverall(:);

    report = table(FrameNumber, BlurScore, IlluminationScore, ContrastScore, ...
        FOVScore, OverallScore, Decision, Representative, IsBestOverall);
    writetable(report, fullfile(outputFolder, 'frame_quality_report.csv'));

    % ---------- Verification aid 1: histogram with Otsu cut lines ----------
    fig = figure('Visible', 'off');
    histogram(overallScore, min(20, numFrames));
    hold on;
    xline(lowCut, 'r--', 'LineWidth', 1.5, 'Label', sprintf('Poor/Borderline (%.3f)', lowCut));
    xline(highCut, 'g--', 'LineWidth', 1.5, 'Label', sprintf('Borderline/Good (%.3f)', highCut));
    hold off;
    title('OverallScore distribution with self-calibrated Otsu thresholds');
    xlabel('OverallScore'); ylabel('Number of sampled frames');
    saveas(fig, fullfile(outputFolder, 'overallscore_histogram.png'));
    close(fig);

    % ---------- Verification aid 2: labeled review montage ----------
    create_quality_review_montage(outputFolder, 6);

    fprintf('\nDone. %d frames sampled from video (%gs windows).\n', numFrames, windowSeconds);
    fprintf('Decision thresholds (Otsu, this video): Poor <= %.4f < Borderline <= %.4f < Good\n', ...
        lowCut, highCut);
    fprintf('Saved to accepted_frames:    %d -> %s\n', sum(isRepresentative), keepDir);
    fprintf('Saved to best_overall_frame: %d -> %s\n', sum(isBestOverall), bestDir);
    fprintf('Saved to rejected_frames:    %d -> %s\n', sum(strcmp(decision,'Poor')), rejectDir);
    fprintf('*** REVIEW THESE TO VERIFY THE THRESHOLDS: ***\n');
    fprintf('  %s\n', fullfile(outputFolder, 'overallscore_histogram.png'));
    fprintf('  %s\n', fullfile(outputFolder, 'quality_review_montage.png'));
end


function p = simplePercentile(x, pct)
% Percentile without requiring the Statistics Toolbox.
    x = sort(x(:));
    n = numel(x);
    if n == 0
        p = NaN;
        return;
    end
    idx = max(1, min(n, round(pct/100 * n)));
    p = x(idx);
end
