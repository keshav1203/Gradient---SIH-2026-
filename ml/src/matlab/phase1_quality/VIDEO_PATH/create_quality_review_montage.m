function create_quality_review_montage(outputFolder, maxPerCategory)
% CREATE_QUALITY_REVIEW_MONTAGE
%   Builds a labeled contact-sheet image so a human can quickly verify
%   whether frames the pipeline classified as Good/Borderline/Poor
%   actually look that way - a visual sanity check on the automatic
%   thresholds, no dataset or ground truth required.
%
%   Reads outputFolder/frame_quality_report.csv (written by
%   process_video_for_prediction.m) and the matching image files in
%   accepted_frames/ and rejected_frames/, and saves:
%       outputFolder/quality_review_montage.png
%   One row per tier (Good / Borderline / Poor), up to maxPerCategory
%   example frames per row, sorted best-to-worst within the tier, each
%   labeled with its OverallScore.
%
%   USAGE:
%       create_quality_review_montage('video_output', 6)
%
%   Requires: Image Processing Toolbox

    if nargin < 2 || isempty(maxPerCategory)
        maxPerCategory = 6;
    end

    reportPath = fullfile(outputFolder, 'frame_quality_report.csv');
    if ~exist(reportPath, 'file')
        error('No frame_quality_report.csv found in %s.', outputFolder);
    end
    report = readtable(reportPath);

    keepDir = fullfile(outputFolder, 'accepted_frames');
    rejectDir = fullfile(outputFolder, 'rejected_frames');

    tiers = {'Good', 'Borderline', 'Poor'};
    fig = figure('Visible', 'off', 'Position', [50 50 200*maxPerCategory 700]);

    for t = 1:numel(tiers)
        tierName = tiers{t};
        sub = report(strcmp(report.Decision, tierName), :);
        if isempty(sub)
            continue;
        end
        sub = sortrows(sub, 'OverallScore', 'descend');
        nTake = min(height(sub), maxPerCategory);

        for i = 1:nTake
            frameNum = sub.FrameNumber(i);
            pattern = sprintf('frame_%05d_*', frameNum);
            candidates = [dir(fullfile(keepDir, pattern)); dir(fullfile(rejectDir, pattern))];
            if isempty(candidates)
                continue;
            end
            imgPath = fullfile(candidates(1).folder, candidates(1).name);
            im = imread(imgPath);

            subplot(numel(tiers), maxPerCategory, (t-1)*maxPerCategory + i);
            imshow(im);
            title(sprintf('%s | %.2f', tierName, sub.OverallScore(i)), ...
                'FontSize', 8, 'Interpreter', 'none');
        end
    end

    outPath = fullfile(outputFolder, 'quality_review_montage.png');
    saveas(fig, outPath);
    close(fig);
    fprintf('Saved review montage: %s\n', outPath);
end
