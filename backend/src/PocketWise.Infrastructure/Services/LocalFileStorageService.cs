using Microsoft.Extensions.Configuration;
using PocketWise.Application.Interfaces;

namespace PocketWise.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _baseStoragePath;

    public LocalFileStorageService(IConfiguration configuration)
    {
        var configuredPath = configuration["FileStorage:BasePath"];
        _baseStoragePath = !string.IsNullOrWhiteSpace(configuredPath)
            ? configuredPath
            : Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "uploads");

        if (!Directory.Exists(_baseStoragePath))
        {
            Directory.CreateDirectory(_baseStoragePath);
        }
    }

    public async Task<string> SaveFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string subFolder,
        CancellationToken cancellationToken = default)
    {
        var targetDir = Path.Combine(_baseStoragePath, subFolder);
        if (!Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        var extension = Path.GetExtension(fileName);
        var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
        var relativePath = Path.Combine(subFolder, uniqueFileName).Replace('\\', '/');
        var fullPath = Path.Combine(_baseStoragePath, relativePath);

        using var destinationStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true);
        fileStream.Seek(0, SeekOrigin.Begin);
        await fileStream.CopyToAsync(destinationStream, cancellationToken);

        return relativePath;
    }

    public Task<(Stream Stream, string ContentType, string FileName)?> GetFileAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_baseStoragePath, storageKey);
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>(null);
        }

        var ext = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            ".csv" => "text/csv",
            ".json" => "application/json",
            _ => "application/octet-stream"
        };

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var fileName = Path.GetFileName(fullPath);

        return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>((stream, contentType, fileName));
    }

    public Task<bool> DeleteFileAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_baseStoragePath, storageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }
}
