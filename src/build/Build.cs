using System;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using Deneblab.AbcVersion;
using Fallout.Common;
using Fallout.Common.IO;
using Fallout.Common.Tooling;
using Fallout.Common.Tools.Npm;
using Serilog;

partial class Build : FalloutBuild
{
    public static int Main() => Execute<Build>(x => x.Package);

    [Parameter("Version to build instead of the one calculated by abcversion")]
    readonly string VersionOverride;

    AbsolutePath ExtensionDirectory => RootDirectory / "src" / "extension";
    AbsolutePath DistDirectory => RootDirectory / "dist";
    AbsolutePath OutputDirectory => RootDirectory / "output";
    AbsolutePath PackageFile => OutputDirectory / $"quickgestures-v{Version}.zip";

    string version;
    string Version => version ??= VersionOverride?.TrimStart('v') ?? AbcVersionFactory
        .CreateBuilder()
        .SetRepositoryRoot(RootDirectory)
        .Build()
        .SemVersion;

    Target Clean => _ => _
        .Before(Restore)
        .Executes(() =>
        {
            DistDirectory.DeleteDirectory();
            OutputDirectory.DeleteDirectory();
        });

    AbsolutePath NodeModulesDirectory => RootDirectory / "node_modules";

    // This machine's platform in npm's terms (process.platform and process.arch)
    static string NpmOs => OperatingSystem.IsWindows() ? "win32" : OperatingSystem.IsMacOS() ? "darwin" : "linux";
    static string NpmCpu => RuntimeInformation.OSArchitecture.ToString().ToLowerInvariant();

    // TypeScript 7 runs a native binary from a per-platform package (e.g. @typescript/typescript-win32-x64);
    // its presence tells whether node_modules was installed for this OS and architecture
    AbsolutePath TscNativePackage => NodeModulesDirectory / "@typescript" / $"typescript-{NpmOs}-{NpmCpu}";

    // Locally node_modules is managed with npm install and shared between Windows and the sandbox,
    // so it is only (re)installed when missing or installed for another OS. --os and --cpu override
    // an os/cpu set in a user .npmrc, which would install the native binaries of another platform
    Target Restore => _ => _
        .OnlyWhenDynamic(() => IsServerBuild || !TscNativePackage.DirectoryExists())
        .Executes(() =>
        {
            NpmTasks.NpmCi(s => s
                .SetProcessWorkingDirectory(RootDirectory)
                .AddProcessAdditionalArguments($"--os={NpmOs}", $"--cpu={NpmCpu}"));
        });

    Target ShowVersion => _ => _
        .Executes(() =>
        {
            Log.Information("Version: {Version}", Version);
        });

    Target Typecheck => _ => _
        .DependsOn(Restore)
        .Executes(() =>
        {
            NpmTasks.NpmRun(s => s
                .SetProcessWorkingDirectory(RootDirectory)
                .SetCommand("typecheck"));
        });

    Target Compile => _ => _
        .DependsOn(Typecheck, ShowVersion)
        .Executes(() =>
        {
            ToolResolver.GetPathTool("node")("esbuild.config.js", workingDirectory: RootDirectory);
            SetManifestVersion(DistDirectory / "manifest.json", Version);
        });

    // Chrome Web Store expects the extension files at the root of the zip
    Target Package => _ => _
        .DependsOn(Compile)
        .Produces(OutputDirectory / "*.zip")
        .Executes(() =>
        {
            var packageDirectory = OutputDirectory / "package";
            packageDirectory.CreateOrCleanDirectory();
            DistDirectory.Copy(packageDirectory, ExistsPolicy.MergeAndOverwrite);
            (RootDirectory / "README.md").CopyToDirectory(packageDirectory);
            (RootDirectory / "LICENSE").CopyToDirectory(packageDirectory);

            PackageFile.DeleteFile();
            packageDirectory.ZipTo(PackageFile);
            packageDirectory.DeleteDirectory();
            Log.Information("Package: {File}", PackageFile);
        });

    static void SetManifestVersion(AbsolutePath manifestFile, string manifestVersion)
    {
        var manifest = JsonNode.Parse(manifestFile.ReadAllText())!.AsObject();
        manifest["version"] = manifestVersion;
        manifestFile.WriteAllText(manifest.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) + "\n");
    }
}
