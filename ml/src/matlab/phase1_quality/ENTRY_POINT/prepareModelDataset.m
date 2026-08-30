function prepareModelDataset(trainLabelsCsv, testLabelsCsv, trainQualityCsv, testQualityCsv, outputRoot)
% PREPAREMODELDATASET
%   Build a binary referable/non-referable model dataset from IDRiD labels
%   and Phase 1 quality reports. Rows are matched by ImageName/image_id,
%   never by row order.
%
%   USAGE:
%       prepareModelDataset()
%       prepareModelDataset(trainLabelsCsv, testLabelsCsv, ...
%           trainQualityCsv, testQualityCsv, outputRoot)
%
%   DEFAULT INPUTS:
%       Enhanced_dataset/train_labels.csv
%       Enhanced_dataset/test_labels.csv
%       phase1_output/train/phase1_quality_report.csv
%       phase1_output/test/phase1_quality_report.csv
%
%   DEFAULT OUTPUT:
%       model_dataset/train/Non_Referable
%       model_dataset/train/Referable
%       model_dataset/test/Non_Referable
%       model_dataset/test/Referable
%       model_dataset/train_model_labels.csv
%       model_dataset/test_model_labels.csv

    if nargin < 1 || isempty(trainLabelsCsv)
        trainLabelsCsv = fullfile('Enhanced_dataset', 'train_labels.csv');
    end
    if nargin < 2 || isempty(testLabelsCsv)
        testLabelsCsv = fullfile('Enhanced_dataset', 'test_labels.csv');
    end
    if nargin < 3 || isempty(trainQualityCsv)
        trainQualityCsv = fullfile('phase1_output', 'train', 'phase1_quality_report.csv');
    end
    if nargin < 4 || isempty(testQualityCsv)
        testQualityCsv = fullfile('phase1_output', 'test', 'phase1_quality_report.csv');
    end
    if nargin < 5 || isempty(outputRoot)
        outputRoot = 'model_dataset';
    end

    trainLabelsCsv = char(trainLabelsCsv);
    testLabelsCsv = char(testLabelsCsv);
    trainQualityCsv = char(trainQualityCsv);
    testQualityCsv = char(testQualityCsv);
    outputRoot = char(outputRoot);

    ensureClassDirs(outputRoot, 'train');
    ensureClassDirs(outputRoot, 'test');

    [trainReport, trainExcluded] = prepareSplit('train', trainLabelsCsv, ...
        trainQualityCsv, outputRoot);
    [testReport, testExcluded] = prepareSplit('test', testLabelsCsv, ...
        testQualityCsv, outputRoot);

    writetable(trainReport, fullfile(outputRoot, 'train_model_labels.csv'));
    writetable(testReport, fullfile(outputRoot, 'test_model_labels.csv'));

    printSummary('train', trainReport, trainExcluded);
    printSummary('test', testReport, testExcluded);
end


function [modelReport, excludedCount] = prepareSplit(splitName, labelsCsv, qualityCsv, outputRoot)
    labels = readCsvTable(labelsCsv);
    quality = readCsvTable(qualityCsv);

    labelImageNames = getColumn(labels, {'ImageName', 'Image name', 'image_name'});
    grades = getColumn(labels, {'RetinopathyGrade', 'Retinopathy grade', 'retinopathy_grade'});

    qualityImageIds = getColumn(quality, {'image_id', 'ImageName', 'Image name'});
    finalDecision = getColumn(quality, {'final_decision', 'FinalDecision'});
    enhancementApplied = getColumn(quality, {'enhancement_applied', 'EnhancementApplied'});
    outputPath = getColumn(quality, {'output_path', 'OutputPath'});
    originalFilename = getColumn(quality, {'filename', 'Filename'});

    labelIds = normalizeImageIds(labelImageNames);
    qualityIds = normalizeImageIds(qualityImageIds);

    n = numel(labelIds);
    rows = cell(n, 8);
    includeRow = false(n, 1);
    excludedCount = 0;

    for i = 1:n
        imageId = labelIds{i};
        labelMatches = find(strcmp(qualityIds, imageId));

        if isempty(labelMatches)
            excludedCount = excludedCount + 1;
            continue;
        end

        qIdx = labelMatches(1);
        decision = scalarToChar(finalDecision, qIdx);
        if strcmpi(decision, 'Poor') || strcmpi(decision, 'Error')
            excludedCount = excludedCount + 1;
            continue;
        end

        grade = scalarToDouble(grades, i);
        binaryClass = gradeToBinaryClass(grade);
        sourcePath = scalarToChar(outputPath, qIdx);
        resolvedSourcePath = resolvePath(sourcePath, fileparts(qualityCsv));

        if ~exist(resolvedSourcePath, 'file')
            warning('Skipping %s: Phase 1 output image not found: %s', ...
                imageId, resolvedSourcePath);
            excludedCount = excludedCount + 1;
            continue;
        end

        destDir = fullfile(outputRoot, splitName, binaryClass);
        [~, sourceBase, sourceExt] = fileparts(resolvedSourcePath);
        destName = [sourceBase sourceExt];
        destPath = fullfile(destDir, destName);

        [copyOk, copyMessage] = copyfile(resolvedSourcePath, destPath);
        if ~copyOk
            warning('Skipping %s: copy failed: %s', imageId, copyMessage);
            excludedCount = excludedCount + 1;
            continue;
        end

        includeRow(i) = true;
        rows(i, :) = {imageId, scalarToChar(originalFilename, qIdx), grade, ...
            binaryClass, decision, scalarToLogical(enhancementApplied, qIdx), ...
            resolvedSourcePath, destPath};
    end

    modelReport = cell2table(rows(includeRow, :), 'VariableNames', { ...
        'image_id', 'original_filename', 'dr_grade', 'binary_class', ...
        'quality_decision', 'enhancement_applied', 'source_path', ...
        'destination_path'});
end


function T = readCsvTable(csvPath)
    if ~exist(csvPath, 'file')
        error('CSV file does not exist: %s', csvPath);
    end

    try
        T = readtable(csvPath, 'VariableNamingRule', 'preserve');
    catch
        T = readtable(csvPath);
    end
end


function values = getColumn(T, candidateNames)
    names = T.Properties.VariableNames;
    normalizedNames = normalizeColumnNames(names);

    for i = 1:numel(candidateNames)
        target = normalizeColumnName(candidateNames{i});
        idx = find(strcmp(normalizedNames, target), 1);
        if ~isempty(idx)
            values = T.(names{idx});
            return;
        end
    end

    error('Missing required column. Expected one of: %s', ...
        strjoin(candidateNames, ', '));
end


function normalized = normalizeColumnNames(names)
    normalized = cell(size(names));
    for i = 1:numel(names)
        normalized{i} = normalizeColumnName(names{i});
    end
end


function name = normalizeColumnName(name)
    name = lower(char(name));
    name = regexprep(name, '[^a-z0-9]', '');
end


function ids = normalizeImageIds(values)
    ids = cell(numel(values), 1);
    for i = 1:numel(values)
        value = scalarToChar(values, i);
        [~, base, ~] = fileparts(value);
        ids{i} = strtrim(base);
    end
end


function value = scalarToChar(values, idx)
    if iscell(values)
        value = values{idx};
    else
        value = values(idx);
    end
    value = char(string(value));
end


function value = scalarToDouble(values, idx)
    if iscell(values)
        value = values{idx};
    else
        value = values(idx);
    end

    if isnumeric(value)
        value = double(value);
    else
        value = str2double(char(string(value)));
    end
end


function value = scalarToLogical(values, idx)
    if iscell(values)
        value = values{idx};
    else
        value = values(idx);
    end

    if islogical(value)
        return;
    elseif isnumeric(value)
        value = value ~= 0;
    else
        textValue = lower(strtrim(char(string(value))));
        value = strcmp(textValue, 'true') || strcmp(textValue, '1');
    end
end


function binaryClass = gradeToBinaryClass(grade)
    if grade == 0 || grade == 1
        binaryClass = 'Non_Referable';
    elseif grade >= 2 && grade <= 4
        binaryClass = 'Referable';
    else
        error('Unexpected RetinopathyGrade value: %g', grade);
    end
end


function pathOut = resolvePath(pathIn, qualityCsvDir)
    pathOut = char(pathIn);
    if exist(pathOut, 'file')
        return;
    end

    relativeToWorkspace = fullfile(pwd, pathOut);
    if exist(relativeToWorkspace, 'file')
        pathOut = relativeToWorkspace;
        return;
    end

    relativeToCsv = fullfile(qualityCsvDir, pathOut);
    if exist(relativeToCsv, 'file')
        pathOut = relativeToCsv;
        return;
    end

    relativeToProjectRoot = fullfile(qualityCsvDir, '..', '..', pathOut);
    if exist(relativeToProjectRoot, 'file')
        pathOut = relativeToProjectRoot;
    end
end


function ensureClassDirs(outputRoot, splitName)
    ensureDir(fullfile(outputRoot, splitName, 'Non_Referable'));
    ensureDir(fullfile(outputRoot, splitName, 'Referable'));
end


function ensureDir(pathName)
    if ~exist(pathName, 'dir')
        mkdir(pathName);
    end
end


function printSummary(splitName, report, excludedCount)
    nonRefCount = sum(strcmp(report.binary_class, 'Non_Referable'));
    refCount = sum(strcmp(report.binary_class, 'Referable'));

    fprintf('\n%s model dataset summary:\n', splitName);
    fprintf('  Non_Referable: %d\n', nonRefCount);
    fprintf('  Referable:     %d\n', refCount);
    fprintf('  Included:      %d\n', height(report));
    fprintf('  Excluded:      %d\n', excludedCount);
end
