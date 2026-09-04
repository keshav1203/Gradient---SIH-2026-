%% runGradCAMAPTOS5Class.m
% APTOS 2019
% 5-Class Diabetic Retinopathy Grad-CAM
%
% Classes:
%   0 = No_DR
%   1 = Mild
%   2 = Moderate
%   3 = Severe
%   4 = Proliferative_DR
%
% Model:
%   ResNet-18
%
% Output:
%   - Predicted class
%   - Confidence
%   - Grad-CAM heatmap
%   - Overlay image
%   - JSON result for backend integration

clear;
clc;
close all;

rng(42);

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
    'aptos5class', ...
    'retinalResNet18_APTOS_5CLASS.mat');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos', ...
    'aptos5class', ...
    'gradcam');

%% ============================================================
% CREATE OUTPUT FOLDER
% ============================================================

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% CHECK MODEL
% ============================================================

if ~isfile(modelFile)

    error( ...
        'APTOS 5-class model not found:\n%s', ...
        modelFile);

end

%% ============================================================
% LOAD MODEL
% ============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS 5-CLASS RESNET-18\n');
fprintf('========================================\n');

modelData = load(modelFile);

if isfield(modelData,'netAPTOS5')

    net = modelData.netAPTOS5;

elseif isfield(modelData,'netAPTOS')

    net = modelData.netAPTOS;

elseif isfield(modelData,'net')

    net = modelData.net;

else

    error( ...
        'No compatible network variable found.');

end

fprintf('Model loaded successfully.\n');

%% ============================================================
% CLASS DEFINITIONS
% =============================================================

classNumbers = [0 1 2 3 4];

classNames = { ...
    'No_DR', ...
    'Mild', ...
    'Moderate', ...
    'Severe', ...
    'Proliferative_DR'};

%% ============================================================
% SELECT IMAGE
% =============================================================

fprintf('\n========================================\n');
fprintf('SELECT RETINAL IMAGE\n');
fprintf('========================================\n');

[fileName,filePath] = uigetfile( ...
    {'*.png;*.jpg;*.jpeg', ...
     'Retinal Images (*.png, *.jpg, *.jpeg)'}, ...
    'Select APTOS retinal image');

if isequal(fileName,0)

    fprintf('No image selected.\n');
    return;

end

imageFile = fullfile( ...
    filePath, ...
    fileName);

fprintf('\nSelected image:\n%s\n',imageFile);

%% ============================================================
% LOAD IMAGE
% =============================================================

fprintf('\nLoading image...\n');

I = imread(imageFile);

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
% ============================================================

fprintf('\n========================================\n');
fprintf('RUNNING PREDICTION\n');
fprintf('========================================\n');

[predictedLabel,scores] = classify( ...
    net, ...
    Iinput);

confidence = max(scores);

predictedClassName = string(predictedLabel);

predictedIndex = find( ...
    strcmp(classNames, ...
    char(predictedClassName)), ...
    1);

if isempty(predictedIndex)

    error( ...
        'Predicted class does not match expected classes.');

end

predictedClassNumber = ...
    classNumbers(predictedIndex);

fprintf('\nPrediction:\n');
fprintf( ...
    '%d = %s\n', ...
    predictedClassNumber, ...
    predictedClassName);

fprintf( ...
    'Confidence: %.2f%%\n', ...
    confidence * 100);

%% ============================================================
% FIND GRAD-CAM LAYER
% ============================================================

fprintf('\n========================================\n');
fprintf('FINDING GRAD-CAM LAYER\n');
fprintf('========================================\n');

lgraph = layerGraph(net);

%% Find convolutional layers

convLayerNames = {};

for i = 1:numel(lgraph.Layers)

    currentLayer = lgraph.Layers(i);

    if isa( ...
            currentLayer, ...
            'nnet.cnn.layer.Convolution2DLayer')

        convLayerNames{end+1} = ...
            currentLayer.Name;

    end

end

if isempty(convLayerNames)

    error( ...
        'No convolutional layers found in ResNet-18.');

end

fprintf('Number of convolutional layers: %d\n', ...
    numel(convLayerNames));

%% Use the final convolutional layer

targetLayer = convLayerNames{end};

fprintf( ...
    'Selected Grad-CAM layer: %s\n', ...
    targetLayer);

%% ============================================================
% GRAD-CAM
% ============================================================

fprintf('\n========================================\n');
fprintf('GENERATING GRAD-CAM\n');
fprintf('========================================\n');

try

    scoreMap = gradCAM( ...
        net, ...
        Iinput, ...
        predictedLabel, ...
        'ReductionLayer',targetLayer);

catch ME

    fprintf('\nStandard Grad-CAM call failed.\n');
    fprintf('Trying Grad-CAM without ReductionLayer...\n');

    try

        scoreMap = gradCAM( ...
            net, ...
            Iinput, ...
            predictedLabel);

    catch ME2

        error( ...
            ['Grad-CAM could not be generated.\n\n' ...
             'First error:\n%s\n\n' ...
             'Second error:\n%s'], ...
             ME.message, ...
             ME2.message);

    end

end

%% ============================================================
% 1 & 2. NORMALIZE HEATMAP TO [0, 1]
% ============================================================

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
    [size(I,1), size(I,2)]);

heatmap = heatmap - min(heatmap(:));
if max(heatmap(:)) > 0
    heatmap = heatmap / max(heatmap(:));
end

%% ============================================================
% ENHANCE HEATMAP CONTRAST FOR VISUALIZATION
% ============================================================
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
% ============================================================

cmap = turbo(256); % Vibrant Turbo colormap (high contrast against reddish fundus)
heatIndices = round(rescale(heatmapVis, 1, 256));
heatIndices = min(max(heatIndices, 1), 256);
heatmapRGB = ind2rgb(heatIndices, cmap); % double RGB [0, 1]

I_double = im2double(I);
if size(I_double, 3) == 1
    I_double = repmat(I_double, 1, 1, 3);
elseif size(I_double, 3) > 3
    I_double = I_double(:,:,1:3);
end

% 4. Smooth Gaussian feathered alpha falloff curve.
% Feathered Gaussian falloff ensures the boundary/edge of the heatmap
% dissolves seamlessly into the background fundus photo without artificial border lines.
maxAlpha = 0.75;
alphaMap = maxAlpha * (1.0 - exp(-(heatmapVis / 0.35).^2));

manualOverlay = alphaMap .* heatmapRGB + (1.0 - alphaMap) .* I_double;
manualOverlay = min(max(manualOverlay, 0), 1);

%% ============================================================
% 6. OPTIONAL SATURATION BOOST STEP (HSV S-channel boost)
% ============================================================

enableSaturationBoost = true; % Toggle for enhanced contrast on reddish retinal scans
saturationMultiplier = 1.4;   % 1.3 - 1.5 boost multiplier

if enableSaturationBoost
    hsvOverlay = rgb2hsv(manualOverlay);
    hsvOverlay(:,:,2) = min(hsvOverlay(:,:,2) * saturationMultiplier, 1.0); % Boost S channel, clip to 1
    manualOverlay = hsv2rgb(hsvOverlay);
    manualOverlay = min(max(manualOverlay, 0), 1);
end

%% ============================================================
% CREATE GRAD-CAM OVERLAY FIGURE (imagesc with AlphaData)
% ============================================================

fprintf('\nCreating Grad-CAM overlay...\n');

figure( ...
    'Visible','off');

imshow(I);

hold on;

hImg = imagesc(heatmapVis);
set(hImg, 'AlphaData', alphaMap); % per-pixel alpha, not a flat 0.55

axis image off;

colormap turbo; % Replaced 'jet' with 'turbo'

colorbar;

title( ...
    sprintf( ...
    'Grad-CAM: %s (%.2f%%)', ...
    char(predictedClassName), ...
    confidence * 100), ...
    'Interpreter','none');

%% ============================================================
% SAVE GRAD-CAM IMAGE
% ============================================================

[~,baseName,~] = fileparts(fileName);

gradcamImageFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.png']);

exportgraphics( ...
    gcf, ...
    gradcamImageFile);

close(gcf);

% Save direct cv2-style blended overlay
directOverlayFile = fullfile( ...
    reportFolder, ...
    [baseName '_direct_overlay.png']);
imwrite(manualOverlay, directOverlayFile);

fprintf('\nGrad-CAM image saved:\n');
fprintf('%s\n',gradcamImageFile);

%% ============================================================
% SAVE RAW HEATMAP
% ============================================================

heatmapFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam_heatmap.png']);

heatmapImage = uint8( ...
    255 * heatmap);

imwrite( ...
    heatmapImage, ...
    heatmapFile);

fprintf('\nRaw heatmap saved:\n');
fprintf('%s\n',heatmapFile);

%% ============================================================
% CLASS PROBABILITIES
% ============================================================

probabilities = struct();

for i = 1:numel(classNames)

    fieldName = matlab.lang.makeValidName( ...
        classNames{i});

    probabilities.(fieldName) = ...
        scores(i);

end

%% ============================================================
% CREATE JSON
% ============================================================

result = struct();

result.dataset = ...
    'APTOS 2019';

result.model = ...
    'ResNet-18';

result.task = ...
    '5-Class Diabetic Retinopathy Classification';

result.image = ...
    fileName;

result.predicted_class = ...
    predictedClassNumber;

result.prediction = ...
    char(predictedClassName);

result.confidence = ...
    confidence;

result.confidence_percent = ...
    confidence * 100;

result.class_probabilities = ...
    probabilities;

result.gradcam_layer = ...
    targetLayer;

result.gradcam_image = ...
    gradcamImageFile;

result.heatmap_image = ...
    heatmapFile;

result.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% SAVE JSON
% ============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    [baseName '_gradcam.json']);

jsonText = jsonencode( ...
    result, ...
    'PrettyPrint',true);

fid = fopen( ...
    jsonFile, ...
    'w');

if fid == -1

    error( ...
        'Could not create Grad-CAM JSON file.');

end

fprintf( ...
    fid, ...
    '%s', ...
    jsonText);

fclose(fid);

%% ============================================================
% FINAL OUTPUT
% ============================================================

fprintf('\n========================================\n');
fprintf('GRAD-CAM COMPLETED\n');
fprintf('========================================\n');

fprintf('\nPrediction:\n');
fprintf( ...
    '%d = %s\n', ...
    predictedClassNumber, ...
    predictedClassName);

fprintf( ...
    'Confidence: %.2f%%\n', ...
    confidence * 100);

fprintf('\nGrad-CAM image:\n');
fprintf('%s\n',gradcamImageFile);

fprintf('\nHeatmap:\n');
fprintf('%s\n',heatmapFile);

fprintf('\nJSON:\n');
fprintf('%s\n',jsonFile);

fprintf('\n========================================\n');