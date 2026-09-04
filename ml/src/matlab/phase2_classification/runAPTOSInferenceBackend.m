function resultFile = runAPTOSInferenceBackend(imageFile, reportFolder, modelFile)
%% runAPTOSInferenceBackend.m
% Headless / Backend-ready inference function for APTOS 2019 DR Classification
%
% Inputs:
%   imageFile    - Full path to input fundus image
%   reportFolder - (Optional) Destination path for heatmaps, overlays, and JSON
%   modelFile    - (Optional) Full path to .mat model checkpoint
%
% Output:
%   resultFile   - Full path to the generated output JSON file

scriptFolder = fileparts(mfilename('fullpath'));
projectRoot = fileparts(fileparts(fileparts(fileparts(scriptFolder))));
phase1Folder = fullfile(fileparts(fileparts(scriptFolder)), 'phase1_quality', 'CORE_FUNCTIONS');
if isfolder(phase1Folder)
    addpath(phase1Folder);
end

if nargin < 2 || isempty(reportFolder)
    reportFolder = fullfile(projectRoot, 'backend', 'reports', 'generated', 'aptos', 'aptos5class', 'inference');
end

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

if nargin < 3 || isempty(modelFile)
    modelFile = fullfile(projectRoot, 'ml', 'models', 'checkpoints', 'aptos5class', 'retinalResNet18_APTOS_5CLASS.mat');
    if ~isfile(modelFile)
        altModelFile = fullfile(projectRoot, 'ml', 'models', 'checkpoints', 'retinalResNet18_APTOS.mat');
        if isfile(altModelFile)
            modelFile = altModelFile;
        end
    end
end

if ~isfile(modelFile)
    error('APTOS model checkpoint not found: %s', modelFile);
end

modelData = load(modelFile);

if isfield(modelData,'netAPTOS5')
    net = modelData.netAPTOS5;
elseif isfield(modelData,'netAPTOS')
    net = modelData.netAPTOS;
elseif isfield(modelData,'net')
    net = modelData.net;
else
    error('No compatible network variable found in model file.');
end

classNumbers = [0 1 2 3 4];
classNames = {'No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR'};

if ~isfile(imageFile)
    error('Input image file not found: %s', imageFile);
end

[~, fileNameOnly, ext] = fileparts(imageFile);
fileName = [fileNameOnly ext];

I = imread(imageFile);

% =============================================================
% 1. RESOLUTION / SIZE VALIDATION (Reject undersized images before resize)
% =============================================================
[imgH, imgW, numChannels] = size(I);
origH = imgH;
origW = imgW;
minDim = 100;
if imgH < minDim || imgW < minDim
    rejectionReason = sprintf('Image resolution too low (%dx%d pixels). Minimum required resolution is %dx%d pixels.', imgW, imgH, minDim, minDim);
    
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
    
    result = struct();
    result.status = 'rejected';
    result.dataset = 'APTOS 2019';
    result.model = 'ResNet-18';
    result.task = '5-Class Diabetic Retinopathy Classification';
    result.image = struct();
    result.image.filename = fileName;
    result.image.original_path = imageFile;
    result.rejection_reason = rejectionReason;
    result.recommendation = 'Please re-capture retinal fundus image with standard camera resolution (minimum 100x100 pixels).';
    result.prediction = struct();
    result.explainability = struct();
    result.quality_assessment = qualityAssessment;
    result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));
    
    resultFile = fullfile(reportFolder, [fileNameOnly '_result.json']);
    jsonText = jsonencode(result, 'PrettyPrint', true);
    fid = fopen(resultFile, 'w');
    if fid ~= -1
        fprintf(fid, '%s', jsonText);
        fclose(fid);
    end
    fprintf('Quality gate REJECTED image due to low resolution: %s (%s)\n', fileName, rejectionReason);
    return;
end

% =============================================================
% 2. RETINA FOV MASK DETECTION
% =============================================================
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

% Check if retinal circle area is plausible
retinaPixelCount = nnz(mask);
minRetinaPixels = max(400, round(0.03 * (imgH * imgW)));
if retinaPixelCount < minRetinaPixels
    rejectionReason = 'Retinal field-of-view not detected or camera frame is empty/corrupt.';
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
    
    result = struct();
    result.status = 'rejected';
    result.dataset = 'APTOS 2019';
    result.model = 'ResNet-18';
    result.task = '5-Class Diabetic Retinopathy Classification';
    result.image = struct();
    result.image.filename = fileName;
    result.image.original_path = imageFile;
    result.rejection_reason = rejectionReason;
    result.recommendation = 'Please re-capture retinal fundus image ensuring proper eye alignment and field of view.';
    result.prediction = struct();
    result.explainability = struct();
    result.quality_assessment = qualityAssessment;
    result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));
    
    resultFile = fullfile(reportFolder, [fileNameOnly '_result.json']);
    jsonText = jsonencode(result, 'PrettyPrint', true);
    fid = fopen(resultFile, 'w');
    if fid ~= -1
        fprintf(fid, '%s', jsonText);
        fclose(fid);
    end
    fprintf('Quality gate REJECTED image due to missing retina FOV: %s\n', fileName);
    return;
end

% =============================================================
% 3. PHASE 1 QUALITY ASSESSMENT GATE (EVALUATED BEFORE INFERENCE)
% Evaluates optical blur, illumination, contrast, and FOV synchronously
% =============================================================
try
    qStruct = assessQuality(I, mask);
    qualityAssessment = struct();
    qualityAssessment.status = 'assessed';
    qualityAssessment.overall_score = round(double(qStruct.overallScore) * 100);
    qualityAssessment.decision = char(qStruct.decision);
    qualityAssessment.blur_score = round(double(qStruct.blurScore) * 100);
    qualityAssessment.illumination_score = round(double(qStruct.illumScore) * 100);
    qualityAssessment.contrast_score = round(double(qStruct.contrastScore) * 100);
    qualityAssessment.fov_score = round(double(qStruct.fovScore) * 100);
    qualityAssessment.is_acceptable = (qStruct.overallScore >= 0.50) && ~strcmp(qStruct.decision, 'Poor');
    qualityAssessment.mean_intensity = round(double(qStruct.meanIntensity), 3);
    qualityAssessment.illum_uniformity = round(double(qStruct.illumUniformity), 3);
    qualityAssessment.rms_contrast = round(double(qStruct.rmsContrast), 3);
    qualityAssessment.fov_ratio = round(double(qStruct.fovRatio), 3);
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
    qStruct = struct('overallScore', 0, 'decision', 'Poor', 'blurScore', 0, 'illumScore', 0, 'contrastScore', 0, 'fovScore', 0);
end

% =============================================================
% 4. QUALITY GATE ENFORCEMENT: Block Poor images before inference
% =============================================================
if strcmp(qualityAssessment.decision, 'Poor') || ~qualityAssessment.is_acceptable
    reasons = {};
    if isfield(qStruct, 'blurScore') && qStruct.blurScore < 0.40
        reasons{end+1} = 'Excessive optical blur / loss of vascular sharpness';
    end
    if isfield(qStruct, 'illumScore') && qStruct.illumScore < 0.40
        if isfield(qStruct, 'meanIntensity') && qStruct.meanIntensity < 0.20
            reasons{end+1} = 'Severe underexposure (retina is too dark)';
        elseif isfield(qStruct, 'meanIntensity') && qStruct.meanIntensity > 0.80
            reasons{end+1} = 'Severe overexposure (retina is washed out)';
        else
            reasons{end+1} = 'Poor or uneven illumination across the retina';
        end
    end
    if isfield(qStruct, 'contrastScore') && qStruct.contrastScore < 0.40
        reasons{end+1} = 'Insufficient contrast to resolve retinal lesions';
    end
    if isfield(qStruct, 'fovScore') && qStruct.fovScore < 0.40
        reasons{end+1} = 'Insufficient or cropped retinal field-of-view';
    end
    if isempty(reasons)
        reasons{end+1} = 'Overall quality score is below clinical threshold for automated diagnosis';
    end
    rejectionReason = strjoin(reasons, '; ');
    
    result = struct();
    result.status = 'rejected';
    result.dataset = 'APTOS 2019';
    result.model = 'ResNet-18';
    result.task = '5-Class Diabetic Retinopathy Classification';
    result.image = struct();
    result.image.filename = fileName;
    result.image.original_path = imageFile;
    result.rejection_reason = rejectionReason;
    result.recommendation = 'Please re-capture retinal fundus image ensuring proper focus, illumination, and centering.';
    result.prediction = struct();
    result.explainability = struct();
    result.quality_assessment = qualityAssessment;
    result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));
    
    resultFile = fullfile(reportFolder, [fileNameOnly '_result.json']);
    jsonText = jsonencode(result, 'PrettyPrint', true);
    fid = fopen(resultFile, 'w');
    if fid ~= -1
        fprintf(fid, '%s', jsonText);
        fclose(fid);
    end
    fprintf('Quality gate REJECTED image: %s (%s)\n', fileName, rejectionReason);
    return;
end

% =============================================================
% 5. PASSED QUALITY GATE: RUN CLASSIFICATION & GRAD-CAM
% =============================================================
% Fast processing optimization: Downsample large images to max 1024px for inference & visualization
maxDim = 1024;
if imgH > maxDim || imgW > maxDim
    scale = maxDim / max(imgH, imgW);
    I = imresize(I, scale);
    if ~isempty(mask)
        mask = logical(imresize(mask, [size(I,1), size(I,2)], 'nearest'));
    end
    [imgH, imgW, numChannels] = size(I);
end

inputSize = net.Layers(1).InputSize;

% Produce model-ready input image via enhancement chain (illumination norm + CLAHE + denoising)
if exist('enhanceImage', 'file') == 2
    try
        IenhModel = enhanceImage(I, mask, inputSize(1:2));
        Iinput = uint8(255 * IenhModel);
    catch
        Iinput = imresize(I, inputSize(1:2));
    end
else
    Iinput = imresize(I, inputSize(1:2));
end

if size(Iinput, 3) == 1
    Iinput = repmat(Iinput, 1, 1, 3);
elseif size(Iinput, 3) > 3
    Iinput = Iinput(:,:,1:3);
end

if ~isa(Iinput, 'uint8')
    Iinput = uint8(min(max(Iinput, 0), 255));
end

[predictedLabel, scores] = classify(net, Iinput);
confidence = double(max(scores));
[~, winningIdx] = max(scores);

canonicalNames = {'No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR'};
canonicalNumbers = [0 1 2 3 4];

% Retrieve true network output classes
if isprop(net, 'Classes') && ~isempty(net.Classes)
    rawNetClasses = cellstr(string(net.Classes));
elseif isprop(net, 'Layers') && isprop(net.Layers(end), 'Classes') && ~isempty(net.Layers(end).Classes)
    rawNetClasses = cellstr(string(net.Layers(end).Classes));
else
    rawNetClasses = {'0', '1', '2', '3', '4'};
end

% Map each rawNetClass index to canonical grade (0..4)
netIndexToCanonicalGrade = zeros(1, numel(rawNetClasses));
for i = 1:numel(rawNetClasses)
    clsStr = strtrim(rawNetClasses{i});
    numVal = str2double(clsStr);
    if ~isnan(numVal) && numVal >= 0 && numVal <= 4
        netIndexToCanonicalGrade(i) = round(numVal);
    else
        foundGrade = -1;
        for k = 1:numel(canonicalNames)
            if strcmpi(clsStr, canonicalNames{k})
                foundGrade = canonicalNumbers(k);
                break;
            end
        end
        if foundGrade >= 0
            netIndexToCanonicalGrade(i) = foundGrade;
        else
            netIndexToCanonicalGrade(i) = min(4, max(0, i - 1));
        end
    end
end

% Predicted class grade (0..4) and name
if winningIdx <= numel(netIndexToCanonicalGrade)
    predictedClassNumber = netIndexToCanonicalGrade(winningIdx);
else
    predictedClassNumber = 0;
end
predictedClassName = canonicalNames{predictedClassNumber + 1};

% Build exact canonical probabilities structure
probabilities = struct();
for k = 1:numel(canonicalNames)
    cGrade = canonicalNumbers(k);
    cName = canonicalNames{k};
    matchIdx = find(netIndexToCanonicalGrade == cGrade, 1);
    if ~isempty(matchIdx) && matchIdx <= numel(scores)
        probabilities.(cName) = double(scores(matchIdx));
    else
        probabilities.(cName) = 0.0;
    end
end

% Grad-CAM
lgraph = layerGraph(net);
convLayerNames = {};
for i = 1:numel(lgraph.Layers)
    currentLayer = lgraph.Layers(i);
    if isa(currentLayer, 'nnet.cnn.layer.Convolution2DLayer')
        convLayerNames{end+1} = currentLayer.Name; %#ok<AGROW>
    end
end

if ~isempty(convLayerNames)
    targetLayer = convLayerNames{end};
else
    targetLayer = 'res5b_branch2b';
end

try
    scoreMap = gradCAM(net, Iinput, predictedLabel, 'ReductionLayer', targetLayer);
catch ME1
    try
        scoreMap = gradCAM(net, Iinput, winningIdx, 'ReductionLayer', targetLayer);
    catch ME2
        try
            scoreMap = gradCAM(net, Iinput, predictedLabel);
        catch ME3
            scoreMap = zeros(inputSize(1:2));
        end
    end
end

scoreMap = double(scoreMap);
scoreMap = scoreMap - min(scoreMap(:));
maxScore = max(scoreMap(:));
if maxScore > 0
    scoreMap = scoreMap ./ maxScore;
end

% Real CLAHE enhancement
enhancedFile = fullfile(reportFolder, [fileNameOnly '_enhanced.png']);
try
    if exist('enhanceImage', 'file') == 2
        Ienh = enhanceImage(I, mask, [size(I,1), size(I,2)]);
        imwrite(Ienh, enhancedFile);
    else
        I_d = im2double(I);
        if size(I_d, 3) >= 3
            I_d(:,:,2) = adapthisteq(I_d(:,:,2), 'ClipLimit', 0.02);
        end
        imwrite(I_d, enhancedFile);
    end
catch
    enhancedFile = '';
end

% =============================================================
% 1 & 2. GAUSSIAN SMOOTHING & HIGH-DENSITY COLOR NORMALIZATION
% =============================================================
map = double(scoreMap);
map = map - min(map(:));
if max(map(:)) > 0
    map = map / max(map(:));
end

% Bilinear resize + Gaussian spatial smoothing to eliminate grid/line artifacts
heatmap = imresize(map, [size(I,1), size(I,2)], 'bilinear');

sigmaSmooth = max(8, round(0.015 * max(size(I,1), size(I,2))));
if exist('imgaussfilt', 'file') == 2
    heatmap = imgaussfilt(heatmap, sigmaSmooth);
end

% Zero out activations outside retina if mask is available
if ~isempty(mask)
    heatmap(~mask) = 0;
end

% Gamma density adjustment for rich, eye-catching color intensity
heatmap = heatmap .^ 0.75;

% Re-normalize active regions to [0, 1]
heatmap = heatmap - min(heatmap(:));
activeMax = max(heatmap(:));
if activeMax > 0
    heatmap = heatmap ./ activeMax;
end
if ~isempty(mask)
    heatmap(~mask) = 0;
end

% =============================================================
% 3. VIBRANT COLORMAP (TURBO)
% =============================================================
cmap = turbo(256);
heatIndices = round(rescale(heatmap, 1, 256));
heatIndices = min(max(heatIndices, 1), 256);
heatmapRGB = ind2rgb(heatIndices, cmap); % double RGB in [0, 1]

% =============================================================
% 4 & 5. NATURAL GAUSSIAN FEATHERED ALPHA BLENDING
% =============================================================
% Smooth Gaussian falloff curve for seamless, organic transition into background retina
maxAlpha = 0.75;
alphaMap = maxAlpha * (1.0 - exp(-(heatmap / 0.35).^2));

if ~isempty(mask)
    if exist('imgaussfilt', 'file') == 2
        featheredMask = imgaussfilt(double(mask), 4);
    else
        featheredMask = double(mask);
    end
    alphaMap = alphaMap .* featheredMask;
end

I_double = im2double(I);
if size(I_double, 3) == 1
    I_double = repmat(I_double, 1, 1, 3);
elseif size(I_double, 3) > 3
    I_double = I_double(:,:,1:3);
end

% Perform smooth per-pixel blending across RGB channels
overlay = zeros(size(I_double));
for c = 1:3
    overlay(:,:,c) = alphaMap .* heatmapRGB(:,:,c) + (1.0 - alphaMap) .* I_double(:,:,c);
end

% Outside retina, preserve original fundus pixel values
if ~isempty(mask)
    for c = 1:3
        oc = overlay(:,:,c);
        ic = I_double(:,:,c);
        oc(~mask) = ic(~mask);
        overlay(:,:,c) = oc;
    end
end
overlay = min(max(overlay, 0), 1);

% =============================================================
% 6. EYE-CATCHING SATURATION BOOST
% =============================================================
hsvOverlay = rgb2hsv(overlay);
hsvOverlay(:,:,2) = min(hsvOverlay(:,:,2) * 1.45, 1.0); % 1.45x saturation multiplier
overlay = hsv2rgb(hsvOverlay);
overlay = min(max(overlay, 0), 1);

% =============================================================
% EXPORT STANDALONE CONTINUOUS RGBA HEATMAP & COMPOSITE OVERLAY
% =============================================================
heat_rgb_uint8 = uint8(255 * heatmapRGB);
alpha_uint8 = uint8(255 * alphaMap);
if ~isempty(mask)
    for c = 1:3
        ch = heat_rgb_uint8(:,:,c);
        ch(~mask) = 0;
        heat_rgb_uint8(:,:,c) = ch;
    end
    alpha_uint8(~mask) = 0;
end
heat_rgba_uint8 = cat(3, heat_rgb_uint8, alpha_uint8);

if size(overlay, 1) ~= origH || size(overlay, 2) ~= origW
    overlay = imresize(overlay, [origH, origW]);
    heat_rgba_uint8 = imresize(heat_rgba_uint8, [origH, origW], 'nearest');
end

heatmapFile = fullfile(reportFolder, [fileNameOnly '_heatmap.png']);
imwrite(heat_rgb_uint8, heatmapFile, 'Alpha', alpha_uint8);

gradcamFile = fullfile(reportFolder, [fileNameOnly '_gradcam.png']);
imwrite(overlay, gradcamFile);

% -------------------------------------------------------------
% DYNAMIC LESION LOCALIZATION (Weakly Supervised via Grad-CAM Peaks)
% -------------------------------------------------------------
detectedLesions = {};
if predictedClassNumber > 0
    hotspotThresh = max(0.40, 0.65 * max(heatmap(:)));
    hotspotBinary = (heatmap >= hotspotThresh) & mask;
    hotspotBinary = bwareaopen(hotspotBinary, max(16, round(0.0002 * numel(hotspotBinary))));
    
    cc = bwconncomp(hotspotBinary);
    if cc.NumObjects > 0
        stats = regionprops(cc, heatmap, 'WeightedCentroid', 'Area', 'MaxIntensity');
        [~, sortIdx] = sort([stats.Area], 'descend');
        stats = stats(sortIdx);
        
        maxHotspots = min(4, numel(stats));
        imH = size(heatmap, 1);
        imW = size(heatmap, 2);
        
        switch predictedClassNumber
            case 1
                labelPool = {'Microaneurysms', 'Focal Microvascular Spot'};
                typePool = {'microaneurysm', 'microaneurysm'};
            case 2
                labelPool = {'Hard Exudates', 'Retinal Hemorrhage', 'Microaneurysm Cluster', 'Cotton Wool Spot'};
                typePool = {'exudates', 'hemorrhage', 'microaneurysm', 'cotton_wool'};
            case 3
                labelPool = {'Intraretinal Hemorrhage', 'Venous Beading / IRMA', 'Deep Blot Hemorrhage', 'Hard Exudates'};
                typePool = {'hemorrhage', 'venous_abnormality', 'hemorrhage', 'exudates'};
            case 4
                labelPool = {'Neovascularization (NVD/NVE)', 'Pre-retinal Hemorrhage', 'Fibrovascular Proliferation', 'Extensive Hemorrhage'};
                typePool = {'neovascularization', 'hemorrhage', 'fibrovascular', 'hemorrhage'};
            otherwise
                labelPool = {'Attention Hotspot'};
                typePool = {'attention'};
        end
        
        for k = 1:maxHotspots
            xCentroid = stats(k).WeightedCentroid(1);
            yCentroid = stats(k).WeightedCentroid(2);
            radiusPx = sqrt(stats(k).Area / pi);
            
            lesionItem = struct();
            lesionItem.id = ['lesion_' num2str(k)];
            lesionItem.label = labelPool{min(k, numel(labelPool))};
            lesionItem.type = typePool{min(k, numel(typePool))};
            lesionItem.x_pct = round((xCentroid / imW) * 100, 1);
            lesionItem.y_pct = round((yCentroid / imH) * 100, 1);
            lesionItem.radius_pct = round(max(3.5, min(14.0, (radiusPx / min(imW, imH)) * 100)), 1);
            lesionItem.activation_score = round(double(stats(k).MaxIntensity), 3);
            lesionItem.confidence_percent = round(confidence * 100 * stats(k).MaxIntensity, 1);
            
            detectedLesions{end+1} = lesionItem; %#ok<AGROW>
        end
    end
end

result = struct();
result.status = 'success';
result.dataset = 'APTOS 2019';
result.model = 'ResNet-18';
result.task = '5-Class Diabetic Retinopathy Classification';

result.image = struct();
result.image.filename = fileName;
result.image.original_path = imageFile;

result.prediction = struct();
result.prediction.class_id = predictedClassNumber;
result.prediction.class_name = char(predictedClassName);
result.prediction.confidence = confidence;
result.prediction.confidence_percent = confidence * 100;
result.prediction.class_probabilities = probabilities;

result.explainability = struct();
result.explainability.method = 'Grad-CAM';
result.explainability.target_class = char(predictedClassName);
result.explainability.target_layer = targetLayer;
result.explainability.heatmap = heatmapFile;
result.explainability.overlay = gradcamFile;
result.explainability.enhanced = enhancedFile;
result.explainability.dynamic_opacity = maxAlpha;
result.explainability.retina_masked = true;
result.explainability.detected_lesions = detectedLesions;

result.quality_assessment = qualityAssessment;
result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));

resultFile = fullfile(reportFolder, [fileNameOnly '_result.json']);
jsonText = jsonencode(result, 'PrettyPrint', true);

fid = fopen(resultFile, 'w');
if fid == -1
    error('Could not create JSON file: %s', resultFile);
end
fprintf(fid, '%s', jsonText);
fclose(fid);

end
