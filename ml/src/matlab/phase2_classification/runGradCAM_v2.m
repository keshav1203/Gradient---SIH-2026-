%% runGradCAM.m
% APTOS 2019
% ResNet-18 Grad-CAM
%
% Generates:
%   - Original image
%   - Grad-CAM heatmap
%   - Overlay
%   - Prediction
%   - Confidence
%   - JSON backend result
%   - MAT result

clear;
clc;
close all;

%% ============================================================
% PROJECT ROOT
% =============================================================

scriptFolder = fileparts(mfilename('fullpath'));

projectRoot = fileparts( ...
    fileparts( ...
    fileparts( ...
    fileparts(scriptFolder))));

fprintf('\nProject root:\n%s\n',projectRoot);

%% ============================================================
% PATHS
% =============================================================

modelFile = fullfile( ...
    projectRoot, ...
    'ml', ...
    'models', ...
    'checkpoints', ...
    'retinalResNet18_APTOS.mat');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos', ...
    'gradcam');

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% LOAD MODEL
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS RESNET-18...\n');
fprintf('========================================\n');

modelData = load(modelFile);

if isfield(modelData,'netAPTOS')

    net = modelData.netAPTOS;

elseif isfield(modelData,'net')

    net = modelData.net;

else

    error( ...
        'No compatible network variable found.');

end

fprintf('Model loaded successfully.\n');

%% ============================================================
% SELECT IMAGE
% =============================================================

[fileName,filePath] = uigetfile( ...
    {'*.png;*.jpg;*.jpeg','Retinal Images (*.png, *.jpg, *.jpeg)'}, ...
    'Select retinal image for Grad-CAM');

if isequal(fileName,0)

    fprintf('No image selected.\n');
    return;

end

imageFile = fullfile(filePath,fileName);

fprintf('\nImage:\n%s\n',imageFile);

%% ============================================================
% LOAD IMAGE
% =============================================================

I = imread(imageFile);

originalImage = I;

%% ============================================================
% PREPARE IMAGE
% =============================================================

inputSize = net.Layers(1).InputSize;

Iinput = imresize( ...
    I, ...
    inputSize(1:2));

if size(Iinput,3) == 1

    Iinput = repmat( ...
        Iinput, ...
        1,1,3);

elseif size(Iinput,3) > 3

    Iinput = Iinput(:,:,1:3);

end

%% ============================================================
% PREDICTION
% =============================================================

fprintf('\n========================================\n');
fprintf('RUNNING PREDICTION...\n');
fprintf('========================================\n');

[predictedLabel,scores] = classify( ...
    net, ...
    Iinput);

confidence = max(scores);

fprintf('\nPrediction : %s\n', ...
    string(predictedLabel));

fprintf('Confidence : %.2f%%\n', ...
    confidence * 100);

%% ============================================================
% GRAD-CAM
% =============================================================

fprintf('\n========================================\n');
fprintf('GENERATING GRAD-CAM...\n');
fprintf('========================================\n');

featureLayer = 'res5b_relu';

fprintf('Feature layer: %s\n',featureLayer);

try

    scoreMap = gradCAM( ...
        net, ...
        Iinput, ...
        predictedLabel, ...
        'FeatureLayer', ...
        featureLayer);

catch ME

    fprintf('\nGrad-CAM error:\n%s\n', ...
        ME.message);

    fprintf('\nAvailable layer names:\n');

    for i = 1:numel(net.Layers)

        fprintf('%d: %s\n', ...
            i, ...
            net.Layers(i).Name);

    end

    rethrow(ME);

end

%% ============================================================
% 1 & 2. NORMALIZE HEATMAP TO [0, 1]
% =============================================================

map = double(scoreMap);
map = map - min(map(:));
if max(map(:)) > 0
    map = map / max(map(:));
end

%% ============================================================
% RESIZE HEATMAP
% =============================================================

heatmap = imresize( ...
    map, ...
    [size(originalImage,1), ...
     size(originalImage,2)]);

heatmap = heatmap - min(heatmap(:));
if max(heatmap(:)) > 0
    heatmap = heatmap / max(heatmap(:));
end

%% ============================================================
% ENHANCE HEATMAP CONTRAST FOR VISUALIZATION
% =============================================================
% Grad-CAM maps are usually low-contrast: most pixels sit in a
% narrow mid-range with only a small "hot" region near 1. Turbo's
% vivid yellows/reds only kick in near the top of the range, so
% a flat map barely shows any color. We stretch + gamma-correct a
% SEPARATE copy (heatmapVis) used only for coloring/alpha, and
% keep the original `heatmap` untouched for the raw output file.

heatmapVis = heatmap;

lowHigh = stretchlim(heatmapVis(:), [0.02 0.98]);
heatmapVis = imadjust(heatmapVis, lowHigh, []);

gammaHeatmap = 0.65;                 % <1 boosts mid-tones toward "hot"
heatmapVis = heatmapVis .^ gammaHeatmap;
heatmapVis = min(max(heatmapVis, 0), 1);

%% ============================================================
% 3 & 5. MANUAL cv2-style addWeighted BLEND (rescale & ind2rgb)
% =============================================================

cmap = turbo(256); % Vibrant Turbo colormap (high contrast against reddish fundus)
heatIndices = round(rescale(heatmapVis, 1, 256));
heatIndices = min(max(heatIndices, 1), 256);
heatmapRGB = ind2rgb(heatIndices, cmap); % double RGB [0, 1]

I_double = im2double(originalImage);
if size(I_double, 3) == 1
    I_double = repmat(I_double, 1, 1, 3);
elseif size(I_double, 3) > 3
    I_double = I_double(:,:,1:3);
end

% 4. Per-pixel alpha instead of one flat number for the whole image.
% A constant alpha (old code) tinted EVERY pixel - including cold,
% zero-activation background - with turbo's dark blue at 55%
% opacity, which is what was washing the whole image out. Scaling
% alpha by heatmapVis keeps cold areas close to the original photo
% and gives hot areas strong, saturated color.
minAlpha = 0.12;   % faint tint on low-activation background
maxAlpha = 0.85;   % strong color on the hottest region
alphaMap = minAlpha + (maxAlpha - minAlpha) * heatmapVis;

manualOverlay = alphaMap .* heatmapRGB + (1 - alphaMap) .* I_double;
manualOverlay = min(max(manualOverlay, 0), 1);

%% ============================================================
% 6. OPTIONAL SATURATION BOOST STEP (HSV S-channel boost)
% =============================================================

enableSaturationBoost = true; % Toggle for enhanced contrast on reddish retinal scans
saturationMultiplier = 1.4;   % 1.3 - 1.5 boost multiplier

if enableSaturationBoost
    hsvOverlay = rgb2hsv(manualOverlay);
    hsvOverlay(:,:,2) = min(hsvOverlay(:,:,2) * saturationMultiplier, 1.0); % Boost S channel, clip to 1
    manualOverlay = hsv2rgb(hsvOverlay);
    manualOverlay = min(max(manualOverlay, 0), 1);
end

%% ============================================================
% CREATE OVERLAY FIGURE (imagesc with AlphaData)
% =============================================================

figure('Visible','off');

imshow(originalImage);

hold on;

hImg = imagesc(heatmapVis);
set(hImg, 'AlphaData', alphaMap); % per-pixel alpha, not a flat 0.55

axis image off;

colormap turbo; % Replaced 'jet' with 'turbo'

colorbar;

title(sprintf( ...
    'APTOS ResNet-18 | %s | %.2f%%', ...
    string(predictedLabel), ...
    confidence * 100));

%% ============================================================
% SAVE GRAD-CAM IMAGE
% =============================================================

[~,baseName,~] = fileparts(fileName);

gradcamFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.png']);

exportgraphics( ...
    gcf, ...
    gradcamFile);

close(gcf);

% Save direct cv2-style blended overlay
directOverlayFile = fullfile( ...
    reportFolder, ...
    [baseName '_direct_overlay.png']);
imwrite(manualOverlay, directOverlayFile);

%% ============================================================
% SAVE RAW HEATMAP
% =============================================================

heatmapFile = fullfile( ...
    reportFolder, ...
    [baseName '_heatmap.png']);

figure('Visible','off');

imagesc(heatmap);

axis image off;

colormap turbo;

colorbar;

title('Grad-CAM Heatmap');

exportgraphics( ...
    gcf, ...
    heatmapFile);

close(gcf);

%% ============================================================
% SAVE MAT DATA
% =============================================================

matFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.mat']);

save( ...
    matFile, ...
    'scoreMap', ...
    'predictedLabel', ...
    'confidence', ...
    'scores', ...
    'featureLayer', ...
    'imageFile');

%% ============================================================
% CREATE JSON
% =============================================================

result = struct();

result.dataset = 'APTOS 2019';

result.model = 'ResNet-18';

result.task = ...
    'Binary Diabetic Retinopathy Classification';

result.image = fileName;

result.prediction = char(predictedLabel);

result.confidence = confidence;

result.confidence_percent = ...
    confidence * 100;

result.gradcam = struct();

result.gradcam.feature_layer = ...
    featureLayer;

result.gradcam.gradcam_image = ...
    gradcamFile;

result.gradcam.heatmap_image = ...
    heatmapFile;

result.gradcam.mat_file = ...
    matFile;

result.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% SAVE JSON
% =============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.json']);

jsonText = jsonencode( ...
    result, ...
    'PrettyPrint',true);

fid = fopen(jsonFile,'w');

if fid == -1
    error('Could not create Grad-CAM JSON.');
end

fprintf(fid,'%s',jsonText);

fclose(fid);

%% ============================================================
% FINAL
% =============================================================

fprintf('\n========================================\n');
fprintf('GRAD-CAM COMPLETED\n');
fprintf('========================================\n');

fprintf('Prediction : %s\n', ...
    string(predictedLabel));

fprintf('Confidence : %.2f%%\n', ...
    confidence * 100);

fprintf('\nGrad-CAM image:\n%s\n', ...
    gradcamFile);

fprintf('\nHeatmap:\n%s\n', ...
    heatmapFile);

fprintf('\nMAT data:\n%s\n', ...
    matFile);

fprintf('\nJSON:\n%s\n', ...
    jsonFile);

fprintf('\n========================================\n');