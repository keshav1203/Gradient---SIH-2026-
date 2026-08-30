function decision = process_single_image_for_prediction(imgPath, outputFolder)
% PROCESS_SINGLE_IMAGE_FOR_PREDICTION
%   Runs the quality gate + enhancement pipeline on ONE doctor-uploaded
%   image. No dataset/calibration file needed - uses fixed heuristic
%   quality thresholds (see assessQuality.m / calcBlurScore.m).
%
%   NOTE: because there's no reference dataset here, these thresholds
%   are a best-effort heuristic, not a data-calibrated cutoff. If you
%   start seeing Good/Poor calls that look wrong on real uploads, that's
%   useful signal - collect a handful of example images and we can
%   retune calcBlurScore.m / calcIlluminationScore.m / etc. accordingly.
%
%   USAGE:
%       process_single_image_for_prediction('upload1.jpg', 'doctor_output')
%
%   OUTPUT:
%       outputFolder/accepted/<filename>  - Good or Borderline -> feed to model
%       outputFolder/rejected/<filename>  - Poor -> not sent to model
%       outputFolder/single_image_report.csv (one row appended per call)
%
%   Requires: Image Processing Toolbox

    acceptedDir = fullfile(outputFolder, 'accepted');
    rejectedDir = fullfile(outputFolder, 'rejected');
    if ~exist(acceptedDir, 'dir'), mkdir(acceptedDir); end
    if ~exist(rejectedDir, 'dir'), mkdir(rejectedDir); end

    I = imread(imgPath);
    if size(I,3) == 1
        I = cat(3, I, I, I);
    elseif size(I,3) == 4
        I = I(:,:,1:3);
    end
    I = im2double(I);

    mask = getFOVMask(I);
    q = assessQuality(I, mask);   % fixed-threshold scoring (no dataset needed)

    Ienh = enhanceImage(I, mask);
    [~, base, ext] = fileparts(imgPath);
    outName = [base ext];

    if strcmp(q.decision, 'Poor')
        outPath = fullfile(rejectedDir, outName);
    else
        outPath = fullfile(acceptedDir, outName);
    end
    imwrite(Ienh, outPath);

    reportPath = fullfile(outputFolder, 'single_image_report.csv');
    row = table({base}, q.blurScore, q.illumScore, q.contrastScore, q.fovScore, ...
        q.overallScore, {q.decision}, ...
        'VariableNames', {'Filename','BlurScore','IlluminationScore','ContrastScore', ...
        'FOVScore','OverallScore','Decision'});
    if exist(reportPath, 'file')
        existing = readtable(reportPath);
        combined = [existing; row];
    else
        combined = row;
    end
    writetable(combined, reportPath);

    decision = q.decision;
    fprintf('%s -> %s (OverallScore=%.4f)\n', base, decision, q.overallScore);
    fprintf('Saved to: %s\n', outPath);
end
