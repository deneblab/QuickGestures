using System;
using System.Linq;
using Fallout.Common;
using Fallout.Common.IO;
using Fallout.Common.Tooling;
using Fallout.Common.Tools.Git;
using Serilog;

partial class Build
{
    AbsolutePath ReleaseNotesFile => OutputDirectory / "RELEASE_NOTES.md";
    string ReleaseTag => $"v{Version}";

    Tool Gh => ToolResolver.GetPathTool("gh");

    Target ReleaseNotes => _ => _
        .DependsOn(ShowVersion)
        .Executes(() =>
        {
            var changes = string.Join("\n", GetCommitsSinceLastTag()
                .Where(subject => !subject.StartsWith("- Merge ") && !subject.Contains("SAVEPOINT")));

            ReleaseNotesFile.WriteAllText($"""
                # QuickGestures {ReleaseTag}

                ## What's Changed
                {(changes.Length > 0 ? changes : "- Initial release")}

                ## Installation
                1. Download the `{PackageFile.Name}` file
                2. Extract the contents
                3. Load the extension in Chrome developer mode

                ## Chrome Web Store
                This version will be available on the Chrome Web Store shortly.

                ---
                **Full Changelog**: https://github.com/deneblab/QuickGestures/releases/tag/{ReleaseTag}

                """);
            Log.Information("Release notes: {File}", ReleaseNotesFile);
        });

    // Runs in the release workflow: tags the commit and creates (or updates) the GitHub release
    Target Release => _ => _
        .DependsOn(Package, ReleaseNotes)
        .Requires(() => IsServerBuild)
        .Executes(() =>
        {
            GitTasks.Git($"tag --force {ReleaseTag}");
            GitTasks.Git($"push --force origin refs/tags/{ReleaseTag}");

            var title = $"QuickGestures {ReleaseTag}";
            var assets = $"\"{PackageFile}\" \"{ReleaseNotesFile}\"";
            if (ReleaseExists(ReleaseTag))
            {
                Gh($"release upload {ReleaseTag} {assets} --clobber");
                Gh($"release edit {ReleaseTag} --title \"{title}\" --notes-file \"{ReleaseNotesFile}\"");
            }
            else
            {
                var prerelease = Version.Contains("alpha") || Version.Contains("beta") ? " --prerelease" : "";
                Gh($"release create {ReleaseTag} {assets} --title \"{title}\" --notes-file \"{ReleaseNotesFile}\"{prerelease}");
            }
        });

    string[] GetCommitsSinceLastTag()
    {
        // The release tag of this build may already point at HEAD, so the previous tag is searched from HEAD^
        var lastTag = GitTasks.Git("describe --tags --abbrev=0 HEAD^", logOutput: false, exitHandler: _ => null)
            .Select(output => output.Text)
            .FirstOrDefault(text => text.StartsWith("v"));

        var range = lastTag != null ? $"{lastTag}..HEAD" : "HEAD";
        return GitTasks.Git($"log {range} --pretty=format:\"- %s (%h)\"", logOutput: false)
            .Select(output => output.Text)
            .Where(text => !string.IsNullOrWhiteSpace(text))
            .ToArray();
    }

    bool ReleaseExists(string tag)
    {
        var exitCode = 0;
        Gh($"release view {tag}", logOutput: false, exitHandler: process => exitCode = process.ExitCode);
        return exitCode == 0;
    }
}
