%% prepareAPTOS.m
% APTOS 2019 Dataset Preparation
% Binary:
% 0,1 -> Non_Referable
% 2,3,4 -> Referable

clear;
clc;

rng(42);

%% Project Root

scriptFolder = fileparts(mfilename('fullpath'));

projectRoot = fileparts( ...
    fileparts( ...
    fileparts( ...
    fileparts(scriptFolder))));

%% Paths

rawFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'raw');

csvFile = fullfile( ...
    rawFolder, ...
    'train.csv');

imageFolder = fullfile( ...
    rawFolder, ...
    'train_images');

processedFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'processed');

%% Create processed folder

if ~isfolder(processedFolder)
    mkdir(processedFolder);
end

%% Check files

if ~isfile(csvFile)
    error('train.csv not found:\n%s', csvFile);
end

if ~isfolder(imageFolder)
    error('train_images folder not found:\n%s', imageFolder);
end

%% Read CSV

fprintf('Loading APTOS CSV...\n');

T = readtable(csvFile);

fprintf('Total records: %d\n',height(T));

%% Required columns

if ~ismember('id_code',T.Properties.VariableNames)
    error('Column "id_code" not found.');
end

if ~ismember('diagnosis',T.Properties.VariableNames)
    error('Column "diagnosis" not found.');
end

%% Binary labels

binaryLabel = strings(height(T),1);

binaryLabel(T.diagnosis <= 1) = "Non_Referable";
binaryLabel(T.diagnosis >= 2) = "Referable";

T.binary_label = binaryLabel;

%% Original distribution

fprintf('\n========================================\n');
fprintf('ORIGINAL APTOS DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(T,'diagnosis'));

%% Binary distribution

fprintf('\n========================================\n');
fprintf('BINARY DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(T,'binary_label'));

%% Check images

fprintf('\nChecking image files...\n');

validImage = false(height(T),1);

for i = 1:height(T)

    imageID = string(T.id_code(i));

    pngPath = fullfile( ...
        imageFolder, ...
        imageID + ".png");

    jpgPath = fullfile( ...
        imageFolder, ...
        imageID + ".jpg");

    jpegPath = fullfile( ...
        imageFolder, ...
        imageID + ".jpeg");

    if isfile(pngPath) || ...
       isfile(jpgPath) || ...
       isfile(jpegPath)

        validImage(i) = true;

    end

end

fprintf('Valid images: %d\n',sum(validImage));
fprintf('Missing images: %d\n',sum(~validImage));

%% Remove missing images

T = T(validImage,:);

fprintf('\nRecords after image validation: %d\n',height(T));

%% Stratified split
% 70% Train
% 15% Validation
% 15% Test

cvTest = cvpartition( ...
    T.binary_label, ...
    'HoldOut',0.15);

testIdx = test(cvTest);
trainValIdx = training(cvTest);

Ttest = T(testIdx,:);
TtrainVal = T(trainValIdx,:);

cvValidation = cvpartition( ...
    TtrainVal.binary_label, ...
    'HoldOut',0.17647);

validationIdx = test(cvValidation);
trainIdx = training(cvValidation);

Ttrain = TtrainVal(trainIdx,:);
Tvalidation = TtrainVal(validationIdx,:);

%% Add split column

Ttrain.split = repmat( ...
    "train", ...
    height(Ttrain),1);

Tvalidation.split = repmat( ...
    "validation", ...
    height(Tvalidation),1);

Ttest.split = repmat( ...
    "test", ...
    height(Ttest),1);

%% IMPORTANT
% Keep ONLY clean metadata columns.
% Do NOT save absolute Windows paths.

Ttrain = Ttrain(:, ...
    {'id_code','diagnosis','binary_label','split'});

Tvalidation = Tvalidation(:, ...
    {'id_code','diagnosis','binary_label','split'});

Ttest = Ttest(:, ...
    {'id_code','diagnosis','binary_label','split'});

Tall = [ ...
    Ttrain;
    Tvalidation;
    Ttest];

%% Save complete metadata

allCSV = fullfile( ...
    processedFolder, ...
    'aptos_binary_labels.csv');

writetable(Tall,allCSV);

%% Save individual CSVs

trainCSV = fullfile( ...
    processedFolder, ...
    'train_labels.csv');

validationCSV = fullfile( ...
    processedFolder, ...
    'validation_labels.csv');

testCSV = fullfile( ...
    processedFolder, ...
    'test_labels.csv');

writetable(Ttrain,trainCSV);
writetable(Tvalidation,validationCSV);
writetable(Ttest,testCSV);

%% Display split sizes

fprintf('\n========================================\n');
fprintf('DATASET SPLIT\n');
fprintf('========================================\n');

fprintf('Training   : %d images\n',height(Ttrain));
fprintf('Validation : %d images\n',height(Tvalidation));
fprintf('Test       : %d images\n',height(Ttest));

%% Distributions

fprintf('\n========================================\n');
fprintf('TRAIN DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(Ttrain,'binary_label'));

fprintf('\n========================================\n');
fprintf('VALIDATION DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(Tvalidation,'binary_label'));

fprintf('\n========================================\n');
fprintf('TEST DISTRIBUTION\n');
fprintf('========================================\n');

disp(groupcounts(Ttest,'binary_label'));

%% Save MATLAB metadata

matFile = fullfile( ...
    processedFolder, ...
    'aptos_dataset_metadata.mat');

save( ...
    matFile, ...
    'Tall', ...
    'Ttrain', ...
    'Tvalidation', ...
    'Ttest');

%% Finished

fprintf('\n========================================\n');
fprintf('APTOS PREPARATION COMPLETED\n');
fprintf('========================================\n');

fprintf('Saved:\n');
fprintf('%s\n',allCSV);
fprintf('%s\n',trainCSV);
fprintf('%s\n',validationCSV);
fprintf('%s\n',testCSV);
fprintf('%s\n',matFile);