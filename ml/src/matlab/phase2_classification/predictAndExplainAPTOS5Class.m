%% predictAndExplainAPTOS5Class.m
% APTOS 2019
% Complete 5-Class Prediction + Grad-CAM Pipeline
%
% Classes:
%   0 = No_DR
%   1 = Mild
%   2 = Moderate
%   3 = Severe
%   4 = Proliferative_DR
%
% Output:
%   1. Prediction
%   2. Confidence
%   3. All class probabilities
%   4. Grad-CAM heatmap
%   5. Combined JSON response
%
% Purpose:
%   Backend-ready inference script

clear;
clc;
close all;

rng(42);

%% ============================================================
% PROJECT ROOT
% ============================================================

scriptFolder = fileparts(mfilename('fullpath'));

projectRoot = fileparts( ...
    fileparts( ...
    fileparts( ...
    fileparts(scriptFolder))));

fprintf('\nProject root:\n%s\n',projectRoot);

%% ============================================================
% PATHS
% ============================================================

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
    'inference');

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
        'No compatible network variable found in model file.');

end

fprintf('Model loaded successfully.\n');

%% ============================================================
% CLASS DEFINITIONS
% ============================================================

classNumbers = [0 1 2 3 4];

classNames = { ...
    'No_DR', ...
    'Mild', ...
    'Moderate', ...
    'Severe', ...
    'Proliferative_DR'};

%% ============================================================
% SELECT IMAGE
% ============================================================

fprintf('\n========================================\n');
fprintf('SELECT RETINAL IMAGE\n');
fprintf('========================================\n');

[fileName,filePath] = uigetfile( ...
    {'*.png;*.jpg;*.jpeg', ...
     'Retinal Images (*.png, *.jpg, *.jpeg)'}, ...
    'Select retinal image');

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
% ============================================================

fprintf('\nLoading image...\n');

I = imread(imageFile);

fprintf('Image loaded successfully.\n');

%% ============================================================
% PREPARE IMAGE
% ============================================================

fprintf('\nPreparing image...\n');

inputSize = net.Layers(1).InputSize;

Iinput = imresize( ...
    I, ...
    inputSize(1:2));

%% Ensure RGB

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
% CLASS PROBABILITIES
% ============================================================

fprintf('\n========================================\n');
fprintf('CLASS PROBABILITIES\n');
fprintf('========================================\n');

probabilities = struct();

for i = 1:numel(classNames)

    probability = double(scores(i));

    fprintf( ...
        '%d - %-20s : %.2f%%\n', ...
        classNumbers(i), ...
        classNames{i}, ...
        probability * 100);

    fieldName = matlab.lang.makeValidName( ...
        classNames{i});

    probabilities.(fieldName) = probability;

end

%% ============================================================
% GRAD-CAM
% ============================================================

fprintf('\n========================================\n');
fprintf('GENERATING GRAD-CAM\n');
fprintf('========================================\n');

%% Find convolutional layers

lgraph = layerGraph(net);

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
        'No convolutional layers found.');

end

%% Select final convolutional layer

targetLayer = convLayerNames{end};

fprintf( ...
    'Grad-CAM layer: %s\n', ...
    targetLayer);

%% Generate Grad-CAM

try

    scoreMap = gradCAM( ...
        net, ...
        Iinput, ...
        predictedLabel, ...
        'ReductionLayer', ...
        targetLayer);

catch

    fprintf( ...
        'Trying Grad-CAM using default layer...\n');

    scoreMap = gradCAM( ...
        net, ...
        Iinput, ...
        predictedLabel);

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
% ============================================================

heatmap = imresize( ...
    map, ...
    [size(I,1),size(I,2)]);

heatmap = heatmap - min(heatmap(:));
if max(heatmap(:)) > 0
    heatmap = heatmap / max(heatmap(:));
end

%% ============================================================
% 3 & 5. MANUAL cv2-style addWeighted BLEND (rescale & ind2rgb)
% ============================================================

cmap = turbo(256); % Vibrant Turbo colormap (high contrast against reddish fundus)
heatIndices = round(rescale(heatmap, 1, 256));
heatIndices = min(max(heatIndices, 1), 256);
heatmapRGB = ind2rgb(heatIndices, cmap); % double RGB [0, 1]

I_double = im2double(I);
if size(I_double, 3) == 1
    I_double = repmat(I_double, 1, 1, 3);
elseif size(I_double, 3) > 3
    I_double = I_double(:,:,1:3);
% 4. Smooth Gaussian feathered alpha falloff curve.
maxAlpha = 0.75;
alphaMap = maxAlpha * (1.0 - exp(-(heatmapVis / 0.35).^2));

manualOverlay = zeros(size(I_double));
for c = 1:3
    manualOverlay(:,:,c) = alphaMap .* heatmapRGB(:,:,c) + (1.0 - alphaMap) .* I_double(:,:,c);
end
manualOverlay = min(max(manualOverlay, 0), 1);

%% ============================================================
% 6. OPTIONAL SATURATION BOOST STEP (HSV S-channel boost)
% ============================================================

enableSaturationBoost = true; % Toggle for enhanced contrast on reddish retinal scans
saturationMultiplier = 1.35;  % 1.3 - 1.4 boost multiplier

if enableSaturationBoost
    hsvOverlay = rgb2hsv(manualOverlay);
    hsvOverlay(:,:,2) = min(hsvOverlay(:,:,2) * saturationMultiplier, 1.0); % Boost S channel, clip to 1
    manualOverlay = hsv2rgb(hsvOverlay);
    manualOverlay = min(max(manualOverlay, 0), 1);
end

%% ============================================================
% SAVE RAW HEATMAP
% ============================================================

[~,baseName,~] = fileparts(fileName);

heatmapFile = fullfile( ...
    reportFolder, ...
    [baseName '_heatmap.png']);

heatmapImage = uint8( ...
    255 * heatmap);

imwrite( ...
    heatmapImage, ...
    heatmapFile);

fprintf('\nHeatmap saved:\n');
fprintf('%s\n',heatmapFile);

%% ============================================================
% CREATE OVERLAY FIGURE (imagesc with AlphaData)
% ============================================================

fprintf('\nCreating Grad-CAM overlay...\n');

figure( ...
    'Visible','off');

imshow(I);

hold on;

hImg = imagesc(heatmap);
set(hImg, 'AlphaData', 0.55); % AlphaData in 0.5 - 0.6 range

axis image off;

colormap turbo; % Replaced 'jet' with 'turbo'

colorbar;

alpha(0.55); % Increased alpha to 0.55

title( ...
    sprintf( ...
    'Grad-CAM: %s (%.2f%%)', ...
    char(predictedClassName), ...
    confidence * 100), ...
    'Interpreter','none');

%% ============================================================
% SAVE OVERLAY
% ============================================================

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

fprintf('\nGrad-CAM overlay saved:\n');
fprintf('%s\n',gradcamFile);

%% ============================================================
% CREATE COMBINED JSON
% ============================================================

fprintf('\n========================================\n');
fprintf('CREATING BACKEND JSON\n');
fprintf('========================================\n');

result = struct();

%% ------------------------------------------------------------
% API / RESULT INFORMATION
% ------------------------------------------------------------

result.status = ...
    'success';

result.dataset = ...
    'APTOS 2019';

result.model = ...
    'ResNet-18';

result.task = ...
    '5-Class Diabetic Retinopathy Classification';

%% ------------------------------------------------------------
% IMAGE INFORMATION
% ------------------------------------------------------------

result.image = struct();

result.image.filename = ...
    fileName;

result.image.original_path = ...
    imageFile;

%% ------------------------------------------------------------
% PREDICTION
% ------------------------------------------------------------

result.prediction = struct();

result.prediction.class_id = ...
    predictedClassNumber;

result.prediction.class_name = ...
    char(predictedClassName);

result.prediction.confidence = ...
    confidence;

result.prediction.confidence_percent = ...
    confidence * 100;

%% ------------------------------------------------------------
% CLASS PROBABILITIES
% ------------------------------------------------------------

result.prediction.class_probabilities = ...
    probabilities;

%% ------------------------------------------------------------
% EXPLAINABILITY
% ------------------------------------------------------------

result.explainability = struct();

result.explainability.method = ...
    'Grad-CAM';

result.explainability.target_class = ...
    char(predictedClassName);

result.explainability.target_layer = ...
    targetLayer;

result.explainability.heatmap = ...
    heatmapFile;

result.explainability.overlay = ...
    gradcamFile;

%% ------------------------------------------------------------
% TIMESTAMP
% ------------------------------------------------------------

result.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% SAVE COMBINED JSON
% ============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    [baseName '_result.json']);

jsonText = jsonencode( ...
    result, ...
    'PrettyPrint',true);

fid = fopen( ...
    jsonFile, ...
    'w');

if fid == -1

    error( ...
        'Could not create JSON file.');

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
fprintf('APTOS INFERENCE COMPLETED\n');
fprintf('========================================\n');

fprintf('\nPrediction:\n');

fprintf( ...
    'Class %d = %s\n', ...
    predictedClassNumber, ...
    predictedClassName);

fprintf( ...
    'Confidence: %.2f%%\n', ...
    confidence * 100);

fprintf('\nCombined JSON:\n');
fprintf('%s\n',jsonFile);

fprintf('\nGrad-CAM overlay:\n');
fprintf('%s\n',gradcamFile);

fprintf('\nHeatmap:\n');
fprintf('%s\n',heatmapFile);

fprintf('\n========================================\n');