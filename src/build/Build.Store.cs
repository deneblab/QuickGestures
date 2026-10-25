using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json.Nodes;
using Fallout.Common;
using Fallout.Common.IO;
using Fallout.Common.Tools.Npm;
using Serilog;

partial class Build
{
    const string ChromeWebStoreCli = "chrome-webstore-upload-cli@4.0.2";

    // Mapped from the CWS_* repository secrets by the publish workflow
    static readonly string[] StoreEnvironmentVariables = { "CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN", "PUBLISHER_ID", "EXTENSION_ID" };

    AbsolutePath StoreDirectory => OutputDirectory / "store";

    // Releases HEAD (or reuses its release) and submits that package for review,
    // unless the store already has this version live or in review
    Target PublishStore => _ => _
        .DependsOn(Release)
        .Executes(() =>
        {
            var missing = StoreEnvironmentVariables.Where(name => string.IsNullOrEmpty(Environment.GetEnvironmentVariable(name))).ToArray();
            Assert.Empty(missing, $"Missing Chrome Web Store secrets: {string.Join(", ", missing.Select(name => $"CWS_{name}"))}");

            var status = FetchStoreStatus();
            var state = status.Published.Contains(Version) ? "already live" : status.Submitted.Contains(Version) ? "already in review" : null;
            if (state != null)
            {
                Log.Information("Chrome Web Store: {Tag} is {State}, nothing to submit", ReleaseTag, state);
                WriteStepSummary($"### Chrome Web Store\n- {ReleaseTag} is {state}; nothing was uploaded.\n");
                return;
            }
            Log.Information("Chrome Web Store: live {Published}, in review {Submitted}",
                string.Join(", ", status.Published.DefaultIfEmpty("-")), string.Join(", ", status.Submitted.DefaultIfEmpty("-")));

            // The store only gets packages that were released on GitHub
            StoreDirectory.CreateOrCleanDirectory();
            Gh($"release download {ReleaseTag} --pattern \"quickgestures-*.zip\" --dir \"{StoreDirectory}\"");
            var package = StoreDirectory.GlobFiles("quickgestures-*.zip").Single();
            Log.Information("Package: {File}", package.Name);

            var extensionId = Environment.GetEnvironmentVariable("EXTENSION_ID");
            ChromeWebStore($"upload --source \"{package}\" --extension-id {extensionId}");
            ChromeWebStore($"publish --extension-id {extensionId}");
            Log.Information("Submitted for review; the version goes live after approval");
            WriteStepSummary($"### Chrome Web Store\n- {ReleaseTag} submitted for review; it goes live automatically after approval.\n");
        });

    void ChromeWebStore(string arguments)
    {
        NpmTasks.Npm($"exec --yes --package={ChromeWebStoreCli} -- chrome-webstore-upload {arguments}", workingDirectory: RootDirectory);
    }

    // Versions of the live and of the submitted revision (Chrome Web Store API v2 fetchStatus)
    static (string[] Published, string[] Submitted) FetchStoreStatus()
    {
        using var http = new HttpClient();

        var tokenResponse = http.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = Environment.GetEnvironmentVariable("CLIENT_ID"),
            ["client_secret"] = Environment.GetEnvironmentVariable("CLIENT_SECRET"),
            ["refresh_token"] = Environment.GetEnvironmentVariable("REFRESH_TOKEN"),
            ["grant_type"] = "refresh_token",
        })).GetAwaiter().GetResult();
        Assert.True(tokenResponse.IsSuccessStatusCode, $"Chrome Web Store OAuth token request failed: {(int)tokenResponse.StatusCode}");
        var accessToken = JsonNode.Parse(tokenResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult())!["access_token"]!.GetValue<string>();

        var url = $"https://chromewebstore.googleapis.com/v2/publishers/{Environment.GetEnvironmentVariable("PUBLISHER_ID")}" +
                  $"/items/{Environment.GetEnvironmentVariable("EXTENSION_ID")}:fetchStatus";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new("Bearer", accessToken);
        var statusResponse = http.Send(request);
        var body = statusResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        Assert.True(statusResponse.IsSuccessStatusCode, $"Chrome Web Store fetchStatus failed: {(int)statusResponse.StatusCode} {body}");

        var status = JsonNode.Parse(body)!;
        return (CrxVersions(status["publishedItemRevisionStatus"]), CrxVersions(status["submittedItemRevisionStatus"]));
    }

    // Both revisions are optional: unset when nothing is live or nothing is pending
    static string[] CrxVersions(JsonNode revision) =>
        revision?["distributionChannels"]?.AsArray()
            .Select(channel => channel?["crxVersion"]?.GetValue<string>())
            .Where(version => !string.IsNullOrEmpty(version))
            .ToArray() ?? Array.Empty<string>();

    static void WriteStepSummary(string markdown)
    {
        var summaryFile = Environment.GetEnvironmentVariable("GITHUB_STEP_SUMMARY");
        if (!string.IsNullOrEmpty(summaryFile))
            File.AppendAllText(summaryFile, markdown);
    }
}
