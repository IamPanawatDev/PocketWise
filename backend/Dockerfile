# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["src/PocketWise.Api/PocketWise.Api.csproj", "src/PocketWise.Api/"]
COPY ["src/PocketWise.Application/PocketWise.Application.csproj", "src/PocketWise.Application/"]
COPY ["src/PocketWise.Domain/PocketWise.Domain.csproj", "src/PocketWise.Domain/"]
COPY ["src/PocketWise.Infrastructure/PocketWise.Infrastructure.csproj", "src/PocketWise.Infrastructure/"]
RUN dotnet restore "src/PocketWise.Api/PocketWise.Api.csproj"

# Copy source code and build/publish
COPY . .
WORKDIR "/src/src/PocketWise.Api"
RUN dotnet publish "PocketWise.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Install native Tesseract & Leptonica libraries required by Tesseract OCR on Linux (Ubuntu 24.04 base)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    libleptonica-dev \
    libc6-dev \
    libjpeg-dev \
    libpng-dev && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Default port for container (Render can override with PORT env variable)
ENV ASPNETCORE_HTTP_PORTS=8080
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "PocketWise.Api.dll"]
