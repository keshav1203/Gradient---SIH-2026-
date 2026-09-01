%% trainAPTOSResNet18.m
% APTOS 2019
% Enhanced images + ResNet-18
% Binary classification:
% 0,1 -> Non_Referable
% 2,3,4 -> Referable

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

fprintf('\nProject root:\n%s\n', projectRoot);

%% ============================================================
% PATHS
% =============================================================

datasetRoot = fullfile( ...
    projectRoot, ...
    'aptos_dataset');

processedFolder = fullfile( ...
    datasetRoot, ...
    'processed');

enhancedFolder = fullfile( ...
    processedFolder, ...
    'enhanced_images');

trainCSV = fullfile( ...
    processedFolder, ...
    'train_labels.csv');

validationCSV = fullfile( ...
    processedFolder, ...
    'validation_labels.csv');

testCSV = fullfile( ...
    processedFolder, ...
    'test_labels.csv');

checkpointFolder = fullfile( ...
    projectRoot, ...
    'ml', ...
    'models', ...
    'checkpoints');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos');

%% Create output folders

if ~isfolder(checkpointFolder)
    mkdir(checkpointFolder);
end

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% CHECK FILES
% =============================================================

assert(isfolder(enhancedFolder), ...
    'Enhanced image folder not found.');

assert(isfile(trainCSV), ...
    'Training CSV not found.');

assert(isfile(validationCSV), ...
    'Validation CSV not found.');

assert(isfile(testCSV), ...
    'Test CSV not found.');

%% ============================================================
% LOAD LABEL TABLES
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS LABELS\n');
fprintf('========================================\n');

trainTable = readtable(trainCSV);
validationTable = readtable(validationCSV);
testTable = readtable(testCSV);

fprintf('Training images   : %d\n', height(trainTable));
fprintf('Validation images : %d\n', height(validationTable));
fprintf('Test images       : %d\n', height(testTable));

%% ============================================================
% CHECK COLUMN NAMES
% =============================================================

requiredColumns = ...
    {'id_code','diagnosis','binary_label'};

for i = 1:numel(requiredColumns)

    if ~ismember( ...
            requiredColumns{i}, ...
            trainTable.Properties.VariableNames)

        error( ...
            'Required column "%s" not found in train_labels.csv.', ...
            requiredColumns{i});

    end

end

%% ============================================================
% CREATE IMAGE FILE PATHS
% =============================================================

fprintf('\n========================================\n');
fprintf('CREATING DATASTORES\n');
fprintf('========================================\n');

trainIDs = string(trainTable.id_code);
validationIDs = string(validationTable.id_code);
testIDs = string(testTable.id_code);

trainFiles = fullfile( ...
    enhancedFolder, ...
    trainIDs + ".png");

validationFiles = fullfile( ...
    enhancedFolder, ...
    validationIDs + ".png");

testFiles = fullfile( ...
    enhancedFolder, ...
    testIDs + ".png");

%% ============================================================
% VERIFY IMAGE FILES
% =============================================================

missingTrain = ~isfile(trainFiles);
missingValidation = ~isfile(validationFiles);
missingTest = ~isfile(testFiles);

fprintf('Missing training images   : %d\n', ...
    sum(missingTrain));

fprintf('Missing validation images : %d\n', ...
    sum(missingValidation));

fprintf('Missing test images       : %d\n', ...
    sum(missingTest));

if any(missingTrain)
    error('Some training images are missing.');
end

if any(missingValidation)
    error('Some validation images are missing.');
end

if any(missingTest)
    error('Some test images are missing.');
end

%% ============================================================
% LABELS
% =============================================================

trainLabels = categorical( ...
    string(trainTable.binary_label));

validationLabels = categorical( ...
    string(validationTable.binary_label));

testLabels = categorical( ...
    string(testTable.binary_label));

%% ============================================================
% IMAGE DATASTORES
% =============================================================

imdsTrain = imageDatastore( ...
    trainFiles, ...
    'Labels', ...
    trainLabels);

imdsValidation = imageDatastore( ...
    validationFiles, ...
    'Labels', ...
    validationLabels);

imdsTest = imageDatastore( ...
    testFiles, ...
    'Labels', ...
    testLabels);

%% ============================================================
% CLASS DISTRIBUTION
% =============================================================

fprintf('\n========================================\n');
fprintf('TRAIN DISTRIBUTION\n');
fprintf('========================================\n');

disp(countEachLabel(imdsTrain));

fprintf('\n========================================\n');
fprintf('VALIDATION DISTRIBUTION\n');
fprintf('========================================\n');

disp(countEachLabel(imdsValidation));

fprintf('\n========================================\n');
fprintf('TEST DISTRIBUTION\n');
fprintf('========================================\n');

disp(countEachLabel(imdsTest));

%% ============================================================
% LOAD RESNET-18
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING RESNET-18\n');
fprintf('========================================\n');

net = resnet18;

inputSize = net.Layers(1).InputSize;

fprintf('Input size: %d x %d x %d\n', ...
    inputSize(1), ...
    inputSize(2), ...
    inputSize(3));

%% ============================================================
% DATA AUGMENTATION
% =============================================================

fprintf('\nCreating data augmentation...\n');

imageAugmenter = imageDataAugmenter( ...
    'RandRotation',[-10 10], ...
    'RandXReflection',true, ...
    'RandXTranslation',[-10 10], ...
    'RandYTranslation',[-10 10], ...
    'RandXScale',[0.95 1.05], ...
    'RandYScale',[0.95 1.05]);

augimdsTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    'DataAugmentation', ...
    imageAugmenter, ...
    'ColorPreprocessing', ...
    'gray2rgb');

augimdsValidation = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsValidation, ...
    'ColorPreprocessing', ...
    'gray2rgb');

augimdsTest = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTest, ...
    'ColorPreprocessing', ...
    'gray2rgb');

%% ============================================================
% MODIFY RESNET-18
% =============================================================

fprintf('\n========================================\n');
fprintf('MODIFYING RESNET-18\n');
fprintf('========================================\n');

lgraph = layerGraph(net);

%% Find fully connected and classification layers

learnableLayer = [];
oldClassificationLayer = [];

for i = 1:numel(lgraph.Layers)

    currentLayer = lgraph.Layers(i);

    if isa( ...
            currentLayer, ...
            'nnet.cnn.layer.FullyConnectedLayer')

        learnableLayer = currentLayer;

    end

    if isa( ...
            currentLayer, ...
            'nnet.cnn.layer.ClassificationOutputLayer')

        oldClassificationLayer = currentLayer;

    end

end

%% Verify

if isempty(learnableLayer)

    error( ...
        'Fully connected layer was not found.');

end

if isempty(oldClassificationLayer)

    error( ...
        'Classification output layer was not found.');

end

fprintf( ...
    'Original FC layer: %s\n', ...
    learnableLayer.Name);

fprintf( ...
    'Original output layer: %s\n', ...
    oldClassificationLayer.Name);

%% ============================================================
% NEW FULLY CONNECTED LAYER
% =============================================================

newFC = fullyConnectedLayer( ...
    2, ...
    'Name', ...
    'fc_aptos', ...
    'WeightLearnRateFactor',10, ...
    'BiasLearnRateFactor',10);

lgraph = replaceLayer( ...
    lgraph, ...
    learnableLayer.Name, ...
    newFC);

%% ============================================================
% NEW CLASSIFICATION LAYER
% =============================================================

newOutputLayer = classificationLayer( ...
    'Name', ...
    'classoutput_aptos');

lgraph = replaceLayer( ...
    lgraph, ...
    oldClassificationLayer.Name, ...
    newOutputLayer);

fprintf('ResNet-18 modification completed.\n');

%% ============================================================
% TRAINING SETTINGS
% =============================================================

fprintf('\n========================================\n');
fprintf('TRAINING SETTINGS\n');
fprintf('========================================\n');

miniBatchSize = 16;
maxEpochs = 10;
initialLearningRate = 1e-4;

validationFrequency = max(1, ...
    floor(numel(trainFiles) / miniBatchSize));

fprintf('Epochs          : %d\n', maxEpochs);
fprintf('Mini-batch size : %d\n', miniBatchSize);
fprintf('Learning rate   : %.1e\n', ...
    initialLearningRate);

%% ============================================================
% TRAINING OPTIONS
% =============================================================

options = trainingOptions( ...
    'sgdm', ...
    'MiniBatchSize',miniBatchSize, ...
    'MaxEpochs',maxEpochs, ...
    'InitialLearnRate',initialLearningRate, ...
    'Momentum',0.9, ...
    'Shuffle','every-epoch', ...
    'ValidationData',augimdsValidation, ...
    'ValidationFrequency',validationFrequency, ...
    'ValidationPatience',3, ...
    'Verbose',true, ...
    'Plots','training-progress', ...
    'ExecutionEnvironment','auto', ...
    'CheckpointPath',checkpointFolder);

%% ============================================================
% TRAIN
% =============================================================

fprintf('\n========================================\n');
fprintf('APTOS RESNET-18 TRAINING\n');
fprintf('========================================\n');

fprintf('\nTraining started...\n\n');

[netAPTOS,info] = trainNetwork( ...
    augimdsTrain, ...
    lgraph, ...
    options);

%% ============================================================
% SAVE MODEL
% =============================================================

modelFile = fullfile( ...
    checkpointFolder, ...
    'retinalResNet18_APTOS.mat');

save( ...
    modelFile, ...
    'netAPTOS', ...
    'info', ...
    '-v7.3');

fprintf('\n========================================\n');
fprintf('MODEL SAVED\n');
fprintf('========================================\n');

fprintf('%s\n',modelFile);

%% ============================================================
% VALIDATION
% =============================================================

fprintf('\nRunning validation prediction...\n');

validationPred = classify( ...
    netAPTOS, ...
    augimdsValidation);

validationAccuracy = mean( ...
    validationPred == validationLabels);

fprintf('\nValidation Accuracy: %.2f%%\n', ...
    validationAccuracy * 100);

%% ============================================================
% TEST
% =============================================================

fprintf('\nRunning test prediction...\n');

testPred = classify( ...
    netAPTOS, ...
    augimdsTest);

testAccuracy = mean( ...
    testPred == testLabels);

fprintf('\n========================================\n');
fprintf('APTOS TEST RESULT\n');
fprintf('========================================\n');

fprintf('Test Accuracy: %.2f%%\n', ...
    testAccuracy * 100);

%% ============================================================
% CONFUSION MATRIX
% =============================================================

figure( ...
    'Name', ...
    'APTOS ResNet-18 Confusion Matrix', ...
    'NumberTitle', ...
    'off');

cm = confusionchart( ...
    testLabels, ...
    testPred);

cm.Title = ...
    'APTOS ResNet-18 - Test Set';

%% ============================================================
% SAVE RESULTS
% =============================================================

resultsFile = fullfile( ...
    reportFolder, ...
    'aptos_resnet18_results.mat');

save( ...
    resultsFile, ...
    'testAccuracy', ...
    'validationAccuracy', ...
    'testPred', ...
    'testLabels', ...
    'validationPred', ...
    'validationLabels', ...
    'info');

fprintf('\nResults saved to:\n');
fprintf('%s\n',resultsFile);

%% ============================================================
% FINAL
% =============================================================

fprintf('\n========================================\n');
fprintf('APTOS TRAINING COMPLETED\n');
fprintf('========================================\n');

fprintf('Validation Accuracy : %.2f%%\n', ...
    validationAccuracy * 100);

fprintf('Test Accuracy       : %.2f%%\n', ...
    testAccuracy * 100);