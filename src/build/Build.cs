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

    // Locally node_modules is managed with npm install; the sandbox shares it with Windows, so it must not be reinstalled here
    Target Restore => _ => _
        .OnlyWhenDynamic(() => IsServerBuild || !(RootDirectory / "node_modules").DirectoryExists())
        .Executes(() =>
        {
            NpmTasks.NpmCi(s => s.SetProcessWorkingDirectory(RootDirectory));
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
