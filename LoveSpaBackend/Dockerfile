FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY LoveSpaBackend/LoveSpaBackend.csproj LoveSpaBackend/
RUN dotnet restore LoveSpaBackend/LoveSpaBackend.csproj

COPY . .
WORKDIR /src/LoveSpaBackend
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "LoveSpaBackend.dll"]
