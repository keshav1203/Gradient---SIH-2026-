function resultFile = assess_doctor_upload_quality(imageFile, reportFolder)
%% ASSESS_DOCTOR_UPLOAD_QUALITY
%   Quality-only MATLAB stage for retinal fundus images.
%   Evaluates blur, illumination, contrast, and FOV without running
%   ResNet-18 classification or Grad-CAM.
%
%   INPUTS:
%       imageFile    - Full path to uploaded image
%       reportFolder - (Optional) Destination directory for JSON result
%
%   OUTPUT:
%       resultFile   - Full path to generated _quality.json file

    scriptFolder = fileparts(mfilename('fullpath'));
    projectRoot = fileparts(fileparts(fileparts(fileparts(scriptFolder))));
    phase1Folder = fullfile(fileparts(scriptFolder), 'CORE_FUNCTIONS');
    if isfolder(phase1Folder)
        addpath(phase1Folder);
    end

    if nargin < 2 || isempty(reportFolder)
        reportFolder = fullfile(projectRoot, 'backend', 'reports', 'generated', 'aptos', 'aptos5class', 'inference');
    end

    if ~isfolder(reportFolder)
        mkdir(reportFolder);
    end

    if ~isfile(imageFile)
        error('Input image file not found: %s', imageFile);
    end

    [~, fileNameOnly, ext] = fileparts(imageFile);
    fileName = [fileNameOnly ext];

    I = imread(imageFile);
    [imgH, imgW, ~] = size(I);

    reasons = {};

    % 1. Resolution Check
    minDim = 100;
    if imgH < minDim || imgW < minDim
        rejectionReason = sprintf('Image resolution too low (%dx%d pixels). Minimum required resolution is %dx%d pixels.', imgW, imgH, minDim, minDim);
        reasons = {rejectionReason};
        
        qualityAssessment = struct();
        qualityAssessment.status = 'rejected';
        qualityAssessment.overall_score = 0;
        qualityAssessment.decision = 'Poor';
        qualityAssessment.blur_score = 0;
        qualityAssessment.illumination_score = 0;
        qualityAssessment.contrast_score = 0;
        qualityAssessment.fov_score = 0;
        qualityAssessment.is_acceptable = false;
        qualityAssessment.mean_intensity = 0;
        qualityAssessment.illum_uniformity = 0;
        qualityAssessment.rms_contrast = 0;
        qualityAssessment.fov_ratio = 0;
        qualityAssessment.rejection_reasons = reasons;
        qualityAssessment.recommendation = 'Please re-capture retinal fundus image with standard camera resolution (minimum 100x100 pixels).';
        
        result = struct();
        result.status = 'rejected';
        result.image = struct('filename', fileName, 'original_path', imageFile);
        result.rejection_reason = rejectionReason;
        result.quality_assessment = qualityAssessment;
        result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));
        
        resultFile = fullfile(reportFolder, [fileNameOnly '_quality.json']);
        jsonText = jsonencode(result, 'PrettyPrint', true);
        fid = fopen(resultFile, 'w');
        if fid ~= -1
            fprintf(fid, '%s', jsonText);
            fclose(fid);
        end
        return;
    end

    % 2. Retinal FOV Mask Detection
    if exist('getFOVMask', 'file') == 2
        try
            mask = getFOVMask(I);
        catch
            mask = [];
        end
    else
        mask = [];
    end

    if isempty(mask) || all(mask(:))
        if size(I, 3) >= 3
            grayI = rgb2gray(I(:,:,1:3));
        else
            grayI = I;
        end
        grayNorm = im2double(grayI);
        thresh = max(0.04, graythresh(grayNorm) * 0.35);
        rawMask = grayNorm > thresh;
        rawMask = bwareaopen(rawMask, max(100, round(0.005 * numel(rawMask))));
        rawMask = imfill(rawMask, 'holes');
        se = strel('disk', max(2, round(min(size(I,1), size(I,2)) * 0.008)));
        mask = imclose(rawMask, se);
        mask = imfill(mask, 'holes');
    end
    mask = logical(imresize(mask, [size(I,1), size(I,2)], 'nearest'));

    retinaPixelCount = nnz(mask);
    minRetinaPixels = max(400, round(0.03 * (imgH * imgW)));
    if retinaPixelCount < minRetinaPixels
        rejectionReason = 'Retinal field-of-view not detected or camera frame is empty/corrupt.';
        reasons = {rejectionReason};
        
        qualityAssessment = struct();
        qualityAssessment.status = 'rejected';
        qualityAssessment.overall_score = 0;
        qualityAssessment.decision = 'Poor';
        qualityAssessment.blur_score = 0;
        qualityAssessment.illumination_score = 0;
        qualityAssessment.contrast_score = 0;
        qualityAssessment.fov_score = 0;
        qualityAssessment.is_acceptable = false;
        qualityAssessment.mean_intensity = 0;
        qualityAssessment.illum_uniformity = 0;
        qualityAssessment.rms_contrast = 0;
        qualityAssessment.fov_ratio = 0;
        qualityAssessment.rejection_reasons = reasons;
        qualityAssessment.recommendation = 'Please re-capture retinal fundus image ensuring proper eye alignment and field of view.';
        
        result = struct();
        result.status = 'rejected';
        result.image = struct('filename', fileName, 'original_path', imageFile);
        result.rejection_reason = rejectionReason;
        result.quality_assessment = qualityAssessment;
        result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));
        
        resultFile = fullfile(reportFolder, [fileNameOnly '_quality.json']);
        jsonText = jsonencode(result, 'PrettyPrint', true);
        fid = fopen(resultFile, 'w');
        if fid ~= -1
            fprintf(fid, '%s', jsonText);
            fclose(fid);
        end
        return;
    end

    % 3. Synchronous Quality Scoring
    try
        qStruct = assessQuality(I, mask);
        blurScorePct = round(double(qStruct.blurScore) * 100);
        illumScorePct = round(double(qStruct.illumScore) * 100);
        contrastScorePct = round(double(qStruct.contrastScore) * 100);
        fovScorePct = round(double(qStruct.fovScore) * 100);
        overallScorePct = round(double(qStruct.overallScore) * 100);
        decision = char(qStruct.decision);
        isAcceptable = (qStruct.overallScore >= 0.50) && ~strcmp(decision, 'Poor');

        if ~isAcceptable || strcmp(decision, 'Poor')
            if qStruct.blurScore < 0.40
                reasons{end+1} = 'Excessive optical blur / loss of vascular sharpness';
            end
            if qStruct.illumScore < 0.40
                if isfield(qStruct, 'meanIntensity') && qStruct.meanIntensity < 0.20
                    reasons{end+1} = 'Severe underexposure (retina is too dark)';
                elseif isfield(qStruct, 'meanIntensity') && qStruct.meanIntensity > 0.80
                    reasons{end+1} = 'Severe overexposure (retina is washed out)';
                else
                    reasons{end+1} = 'Poor or uneven illumination across the retina';
                end
            end
            if qStruct.contrastScore < 0.40
                reasons{end+1} = 'Insufficient contrast to resolve retinal lesions';
            end
            if qStruct.fovScore < 0.40
                reasons{end+1} = 'Insufficient or cropped retinal field-of-view';
            end
            if isempty(reasons)
                reasons{end+1} = 'Overall quality score is below clinical threshold for automated diagnosis';
            end
        end

        qualityAssessment = struct();
        qualityAssessment.status = 'assessed';
        qualityAssessment.overall_score = overallScorePct;
        qualityAssessment.decision = decision;
        qualityAssessment.blur_score = blurScorePct;
        qualityAssessment.illumination_score = illumScorePct;
        qualityAssessment.contrast_score = contrastScorePct;
        qualityAssessment.fov_score = fovScorePct;
        qualityAssessment.is_acceptable = isAcceptable;
        qualityAssessment.mean_intensity = round(double(qStruct.meanIntensity), 3);
        qualityAssessment.illum_uniformity = round(double(qStruct.illumUniformity), 3);
        qualityAssessment.rms_contrast = round(double(qStruct.rmsContrast), 3);
        qualityAssessment.fov_ratio = round(double(qStruct.fovRatio), 3);
        qualityAssessment.rejection_reasons = reasons;
        if isAcceptable
            qualityAssessment.recommendation = 'Image quality meets clinical standards for automated diagnostic screening.';
        else
            qualityAssessment.recommendation = 'Please re-capture retinal fundus image addressing flagged quality issues.';
        end

        result = struct();
        if isAcceptable
            result.status = 'success';
        else
            result.status = 'rejected';
            result.rejection_reason = strjoin(reasons, '; ');
        end
        result.image = struct('filename', fileName, 'original_path', imageFile);
        result.quality_assessment = qualityAssessment;
        result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));

    catch ME
        qualityAssessment = struct();
        qualityAssessment.status = 'error';
        qualityAssessment.overall_score = 0;
        qualityAssessment.decision = 'Poor';
        qualityAssessment.blur_score = 0;
        qualityAssessment.illumination_score = 0;
        qualityAssessment.contrast_score = 0;
        qualityAssessment.fov_score = 0;
        qualityAssessment.is_acceptable = false;
        qualityAssessment.error = ME.message;
        qualityAssessment.rejection_reasons = {['Quality evaluation error: ' ME.message]};

        result = struct();
        result.status = 'error';
        result.error = ME.message;
        result.image = struct('filename', fileName, 'original_path', imageFile);
        result.quality_assessment = qualityAssessment;
        result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));
    end

    resultFile = fullfile(reportFolder, [fileNameOnly '_quality.json']);
    jsonText = jsonencode(result, 'PrettyPrint', true);
    fid = fopen(resultFile, 'w');
    if fid ~= -1
        fprintf(fid, '%s', jsonText);
        fclose(fid);
    end
end
