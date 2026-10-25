using System;
using System.Linq;
using Fallout.Common;
using Fallout.Common.IO;
using Fallout.Common.Tools.Npm;
using Serilog;

partial class Build
{
    const string ChromeWebStoreCli = "chrome-webstore-upload-cli@4.0.2";

    [Parameter("GitHub release to publish to the Chrome Web Store, e.g. v0.3.8 (default: latest release)")]
    readonly string StoreReleaseTag;

    [Parameter("review = upload and submit for review, draft = upload only")]
    readonly string StoreTarget = "review";

    // Mapped from the CWS_* repository secrets by the publish workflow
    static readonly string[] StoreEnvironmentVariables = { "CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN", "PUBLISHER_ID", "EXTENSION_ID" };

    AbsolutePath StoreDirectory => OutputDirectory / "store";

    Target PublishStore => _ => _
        .Requires(() => StoreTarget == "review" || StoreTarget == "draft")
        .Executes(() =>
        {
            var missing = StoreEnvironmentVariables.Where(name => string.IsNullOrEmpty(Environment.GetEnvironmentVariable(name))).ToArray();
            Assert.Empty(missing, $"Missing Chrome Web Store secrets: {string.Join(", ", missing.Select(name => $"CWS_{name}"))}");

            // The store only gets packages that were released on GitHub
            StoreDirectory.CreateOrCleanDirectory();
            Gh($"release download {StoreReleaseTag} --pattern \"quickgestures-*.zip\" --dir \"{StoreDirectory}\"");
            var package = StoreDirectory.GlobFiles("quickgestures-*.zip").Single();
            Log.Information("Package: {File}", package.Name);

            var extensionId = Environment.GetEnvironmentVariable("EXTENSION_ID");
            ChromeWebStore($"upload --source \"{package}\" --extension-id {extensionId}");

            if (StoreTarget == "review")
            {
                ChromeWebStore($"publish --extension-id {extensionId}");
                Log.Information("Submitted for review; the version goes live after approval");
            }
            else
            {
                Log.Information("Uploaded as a draft; submit it from https://chrome.google.com/webstore/devconsole");
            }
        });

    void ChromeWebStore(string arguments)
    {
        NpmTasks.Npm($"exec --yes --package={ChromeWebStoreCli} -- chrome-webstore-upload {arguments}", workingDirectory: RootDirectory);
    }
}
