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
% NORMALIZE HEATMAP
% ============================================================

scoreMap = double(scoreMap);

scoreMap = ...
    scoreMap - min(scoreMap(:));

maxScore = max(scoreMap(:));

if maxScore > 0

    scoreMap = ...
        scoreMap ./ maxScore;

end

%% ============================================================
% RESIZE HEATMAP
% ============================================================

heatmap = imresize( ...
    scoreMap, ...
    [size(I,1),size(I,2)]);

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
% CREATE OVERLAY
% ============================================================

fprintf('\nCreating Grad-CAM overlay...\n');

figure( ...
    'Visible','off');

imshow(I);

hold on;

imagesc(heatmap);

axis image off;

colormap jet;

colorbar;

alpha(0.45);

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