%% predictDR.m
% APTOS 2019
% ResNet-18 Binary DR Prediction
%
% Output:
%   Prediction
%   Confidence
%   Class probabilities
%   Grad-CAM
%   JSON result for backend

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

fprintf('\nProject root:\n%s\n', projectRoot);

%% ============================================================
% PATHS
% =============================================================

modelFile = fullfile( ...
    projectRoot, ...
    'ml', ...
    'models', ...
    'checkpoints', ...
    'retinalResNet18_APTOS.mat');

enhancedFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'processed', ...
    'enhanced_images');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos', ...
    'predictions');

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% CHECK MODEL
% =============================================================

if ~isfile(modelFile)
    error( ...
        'APTOS model not found:\n%s', ...
        modelFile);
end

%% ============================================================
% LOAD MODEL
% ============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS RESNET-18 V2...\n');
fprintf('========================================\n');

modelData = load(modelFile);

if isfield(modelData,'netAPTOS')

    net = modelData.netAPTOS;

elseif isfield(modelData,'net')

    net = modelData.net;

else

    error( ...
        'No compatible network variable found in model file.');

end

fprintf('Model loaded successfully.\n');

%% ============================================================
% SELECT IMAGE
% =============================================================

fprintf('\n========================================\n');
fprintf('SELECT RETINAL IMAGE\n');
fprintf('========================================\n');

[fileName,filePath] = uigetfile( ...
    {'*.png;*.jpg;*.jpeg','Retinal Images (*.png, *.jpg, *.jpeg)'}, ...
    'Select APTOS retinal image');

if isequal(fileName,0)

    fprintf('No image selected.\n');
    return;

end

imageFile = fullfile(filePath,fileName);

fprintf('\nSelected image:\n%s\n',imageFile);

%% ============================================================
% LOAD IMAGE
% =============================================================

fprintf('\nLoading retinal image...\n');

I = imread(imageFile);

fprintf('Image loaded successfully.\n');

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

fprintf('\n========================================\n');
fprintf('       APTOS RESNET-18 PREDICTION\n');
fprintf('========================================\n');

fprintf('Prediction : %s\n', ...
    string(predictedLabel));

fprintf('Confidence : %.2f%%\n', ...
    confidence * 100);

%% ============================================================
% CLASS PROBABILITIES
% =============================================================

classNames = categories( ...
    categorical(net.Layers(end).Classes));

fprintf('\nClass probabilities:\n');

probabilities = struct();

for i = 1:numel(classNames)

    probability = scores(i);

    fprintf('  %-20s : %.2f%%\n', ...
        classNames{i}, ...
        probability * 100);

    fieldName = matlab.lang.makeValidName( ...
        classNames{i});

    probabilities.(fieldName) = probability;

end

%% ============================================================
% SAVE PREDICTION IMAGE
% =============================================================

[~,baseName,~] = fileparts(fileName);

predictionImageFile = fullfile( ...
    reportFolder, ...
    [baseName '_prediction.png']);

figure('Visible','off');

imshow(I);

title(sprintf( ...
    '%s (%.2f%%)', ...
    string(predictedLabel), ...
    confidence * 100));

exportgraphics( ...
    gcf, ...
    predictionImageFile);

close(gcf);

%% ============================================================
% JSON RESULT
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

result.class_probabilities = probabilities;

result.prediction_image = ...
    predictionImageFile;

result.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% SAVE JSON
% =============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    [baseName '_prediction.json']);

jsonText = jsonencode( ...
    result, ...
    'PrettyPrint',true);

fid = fopen(jsonFile,'w');

if fid == -1
    error('Could not create prediction JSON.');
end

fprintf(fid,'%s',jsonText);

fclose(fid);

%% ============================================================
% FINAL
% =============================================================

fprintf('\n========================================\n');
fprintf('PREDICTION COMPLETED\n');
fprintf('========================================\n');

fprintf('Prediction : %s\n', ...
    string(predictedLabel));

fprintf('Confidence : %.2f%%\n', ...
    confidence * 100);

fprintf('\nJSON saved to:\n');
fprintf('%s\n',jsonFile);

fprintf('\nPrediction image saved to:\n');
fprintf('%s\n',predictionImageFile);