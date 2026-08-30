function report = runPhase1Dataset(inputImageDir, outputRoot, splitName)
% RUNPHASE1DATASET
%   Dataset-level Phase 1 quality pipeline for IDRiD-style fundus image
%   directories. Processes images only; videos are intentionally ignored.
%
%   USAGE:
%       runPhase1Dataset('Enhanced_dataset/train/images', 'phase1_output', 'train')
%       runPhase1Dataset('Enhanced_dataset/test/images',  'phase1_output', 'test')
%
%   INPUTS:
%       inputImageDir - directory containing fundus images
%       outputRoot    - root directory where accepted/rejected images and
%                       the dataset-level CSV will be saved
%       splitName     - split label written to the CSV, e.g. train/test
%
%   OUTPUT:
%       outputRoot/<splitName>/accepted/original/   - original Good images
%       outputRoot/<splitName>/accepted/enhanced/   - Borderline images
%                                                     accepted after
%                                                     enhancement
%       outputRoot/<splitName>/rejected/original/   - original Poor images
%       outputRoot/<splitName>/rejected/enhanced/   - Borderline images
%                                                     still Poor after
%                                                     enhancement
%       outputRoot/<splitName>/phase1_quality_report.csv

    if nargin < 1 || isempty(inputImageDir)
        inputImageDir = fullfile('Enhanced_dataset', 'train', 'images');
    end
    if nargin < 2 || isempty(outputRoot)
        outputRoot = fullfile('phase1_output');
    end
    if nargin < 3 || isempty(splitName)
        splitName = inferSplitName(inputImageDir);
    end
    inputImageDir = char(inputImageDir);
    outputRoot = char(outputRoot);
    splitName = char(splitName);

    thisDir = fileparts(mfilename('fullpath'));
    coreDir = fullfile(thisDir, '..', 'CORE_FUNCTIONS');
    addpath(coreDir);

    if ~exist(inputImageDir, 'dir')
        error('Input image directory does not exist: %s', inputImageDir);
    end

    splitOutputDir = fullfile(outputRoot, splitName);
    acceptedOriginalDir = fullfile(splitOutputDir, 'accepted', 'original');
    acceptedEnhancedDir = fullfile(splitOutputDir, 'accepted', 'enhanced');
    rejectedOriginalDir = fullfile(splitOutputDir, 'rejected', 'original');
    rejectedEnhancedDir = fullfile(splitOutputDir, 'rejected', 'enhanced');

    ensureDir(acceptedOriginalDir);
    ensureDir(acceptedEnhancedDir);
    ensureDir(rejectedOriginalDir);
    ensureDir(rejectedEnhancedDir);

    imageFiles = listImageFiles(inputImageDir);
    n = numel(imageFiles);
    rows = cell(n, 20);

    fprintf('Phase 1 dataset processing: %s\n', inputImageDir);
    fprintf('Found %d image file(s). Split: %s\n', n, splitName);

    for i = 1:n
        inputPath = fullfile(imageFiles(i).folder, imageFiles(i).name);
        [~, imageId, ext] = fileparts(imageFiles(i).name);
        timestamp = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));

        originalBlur = NaN;
        originalIllum = NaN;
        originalContrast = NaN;
        originalFov = NaN;
        originalOverall = NaN;
        originalDecision = '';
        enhancementApplied = false;
        enhancedBlur = NaN;
        enhancedIllum = NaN;
        enhancedContrast = NaN;
        enhancedFov = NaN;
        enhancedOverall = NaN;
        finalDecision = '';
        outputPath = '';
        errorStatus = 'OK';

        try
            I = readImageAsRgbDouble(inputPath);
            mask = getFOVMask(I);
            qOriginal = assessQuality(I, mask);

            originalBlur = qOriginal.blurScore;
            originalIllum = qOriginal.illumScore;
            originalContrast = qOriginal.contrastScore;
            originalFov = qOriginal.fovScore;
            originalOverall = qOriginal.overallScore;
            originalDecision = qOriginal.decision;

            outName = [imageId ext];
            if strcmp(qOriginal.decision, 'Good')
                finalDecision = 'Good';
                outputPath = fullfile(acceptedOriginalDir, outName);
                imwrite(I, outputPath);
            elseif strcmp(qOriginal.decision, 'Poor')
                finalDecision = 'Poor';
                outputPath = fullfile(rejectedOriginalDir, outName);
                imwrite(I, outputPath);
            else
                enhancementApplied = true;
                Ienh = enhanceImage(I, mask);
                enhancedMask = getFOVMask(Ienh);
                qEnhanced = assessQuality(Ienh, enhancedMask);

                enhancedBlur = qEnhanced.blurScore;
                enhancedIllum = qEnhanced.illumScore;
                enhancedContrast = qEnhanced.contrastScore;
                enhancedFov = qEnhanced.fovScore;
                enhancedOverall = qEnhanced.overallScore;
                finalDecision = qEnhanced.decision;

                outName = [imageId '_enhanced.png'];
                if strcmp(qEnhanced.decision, 'Poor')
                    outputPath = fullfile(rejectedEnhancedDir, outName);
                else
                    outputPath = fullfile(acceptedEnhancedDir, outName);
                end
                imwrite(Ienh, outputPath);
            end
        catch ME
            finalDecision = 'Error';
            errorStatus = ME.message;
        end

        rows(i, :) = {imageId, imageFiles(i).name, inputPath, ...
            originalBlur, originalIllum, originalContrast, originalFov, ...
            originalOverall, originalDecision, enhancementApplied, ...
            enhancedBlur, enhancedIllum, enhancedContrast, enhancedFov, ...
            enhancedOverall, finalDecision, outputPath, errorStatus, ...
            splitName, timestamp};

        fprintf('[%d/%d] %s -> %s\n', i, n, imageFiles(i).name, finalDecision);
    end

    report = cell2table(rows, 'VariableNames', { ...
        'image_id', 'filename', 'input_path', ...
        'original_blur_score', 'original_illumination_score', ...
        'original_contrast_score', 'original_fov_score', ...
        'original_overall_score', 'original_decision', ...
        'enhancement_applied', ...
        'enhanced_blur_score', 'enhanced_illumination_score', ...
        'enhanced_contrast_score', 'enhanced_fov_score', ...
        'enhanced_overall_score', 'final_decision', ...
        'output_path', 'error_status', 'split', ...
        'processing_timestamp'});

    reportPath = fullfile(splitOutputDir, 'phase1_quality_report.csv');
    writetable(report, reportPath);
    fprintf('Saved dataset-level report: %s\n', reportPath);
end


function files = listImageFiles(inputImageDir)
    exts = {'*.jpg', '*.jpeg', '*.png', '*.tif', '*.tiff', '*.bmp', ...
        '*.JPG', '*.JPEG', '*.PNG', '*.TIF', '*.TIFF', '*.BMP'};
    files = dir(fullfile(inputImageDir, exts{1}));
    for i = 2:numel(exts)
        files = [files; dir(fullfile(inputImageDir, exts{i}))]; %#ok<AGROW>
    end
    if isempty(files)
        return;
    end
    filePaths = cellfun(@fullfile, {files.folder}, {files.name}, ...
        'UniformOutput', false);
    [~, uniqueIdx] = unique(lower(filePaths), 'stable');
    files = files(uniqueIdx);
    [~, order] = sort(lower({files.name}));
    files = files(order);
end


function I = readImageAsRgbDouble(inputPath)
    I = imread(inputPath);
    if size(I, 3) == 1
        I = cat(3, I, I, I);
    elseif size(I, 3) == 4
        I = I(:, :, 1:3);
    end
    I = im2double(I);
end


function ensureDir(pathName)
    if ~exist(pathName, 'dir')
        mkdir(pathName);
    end
end


function splitName = inferSplitName(inputImageDir)
    pathParts = regexp(inputImageDir, '[\\/]+', 'split');
    splitName = 'dataset';
    for i = 1:numel(pathParts)
        part = lower(pathParts{i});
        if strcmp(part, 'train') || strcmp(part, 'test')
            splitName = part;
            return;
        end
    end
end
