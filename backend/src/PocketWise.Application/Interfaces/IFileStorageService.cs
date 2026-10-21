namespace PocketWise.Application.Interfaces;

public interface IFileStorageService
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string contentType, string subFolder, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType, string FileName)?> GetFileAsync(string storageKey, CancellationToken cancellationToken = default);
    Task<bool> DeleteFileAsync(string storageKey, CancellationToken cancellationToken = default);
}
