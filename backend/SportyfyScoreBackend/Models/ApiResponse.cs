namespace SportyfyScoreBackend.Models;

public class ApiResponse<T>
{
    public int StatusCode { get; init; }
    public string Message { get; init; } = string.Empty;
    public object? Errors { get; init; }
    public T? Data { get; init; }

    public static ApiResponse<T> Success(string message, T data)
    {
        return new ApiResponse<T>
        {
            StatusCode = 200,
            Message = message,
            Errors = null,
            Data = data
        };
    }

    public static ApiResponse<T> Failure(string message, object? errors = null)
    {
        return new ApiResponse<T>
        {
            StatusCode = 400,
            Message = message,
            Errors = errors,
            Data = default
        };
    }
}

