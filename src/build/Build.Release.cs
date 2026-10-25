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

    // Runs in the release workflows: tags the commit and creates the GitHub release.
    // A released version is never overwritten; PublishStore reuses the existing release instead.
    Target Release => _ => _
        .DependsOn(Package, ReleaseNotes)
        .Requires(() => IsServerBuild)
        .Executes(() =>
        {
            if (ReleaseExists(ReleaseTag))
            {
                Assert.True(InvokedTargets.Any(target => target.Name == nameof(PublishStore)),
                    $"Release {ReleaseTag} already exists; a version is never released twice");
                Log.Information("Release {Tag} already exists, reusing it", ReleaseTag);
                return;
            }

            var head = GitTasks.Git("rev-parse HEAD", logOutput: false).Single().Text;
            var tagCommit = RemoteTagCommit(ReleaseTag);
            if (tagCommit == null)
            {
                GitTasks.Git($"tag {ReleaseTag}");
                GitTasks.Git($"push origin refs/tags/{ReleaseTag}");
            }
            else
            {
                // Tag left by an earlier run that failed before creating the release
                Assert.True(tagCommit == head, $"Tag {ReleaseTag} already points at {tagCommit}, not at HEAD {head}; tags are never moved");
                Log.Information("Tag {Tag} already points at HEAD, creating only the release", ReleaseTag);
            }

            var title = $"QuickGestures {ReleaseTag}";
            var assets = $"\"{PackageFile}\" \"{ReleaseNotesFile}\"";
            var prerelease = Version.Contains("alpha") || Version.Contains("beta") ? " --prerelease" : "";
            Gh($"release create {ReleaseTag} {assets} --verify-tag --title \"{title}\" --notes-file \"{ReleaseNotesFile}\"{prerelease}");
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

    // Commit of the tag on origin, or null; for an annotated tag the peeled ^{} line holds the commit
    static string RemoteTagCommit(string tag)
    {
        var lines = GitTasks.Git($"ls-remote --tags origin refs/tags/{tag} refs/tags/{tag}^{{}}", logOutput: false)
            .Select(output => output.Text.Split('\t'))
            .Where(parts => parts.Length == 2)
            .ToArray();
        return (lines.FirstOrDefault(parts => parts[1].EndsWith("^{}")) ?? lines.FirstOrDefault())?[0];
    }

    bool ReleaseExists(string tag)
    {
        var exitCode = 0;
        Gh($"release view {tag}", logOutput: false, exitHandler: process => exitCode = process.ExitCode);
        return exitCode == 0;
    }
}
