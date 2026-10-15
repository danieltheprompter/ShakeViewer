import SwiftUI

struct BookmarksScreen: View {
    @Environment(QuakeViewModel.self) private var model
    @Environment(AccountService.self) private var account

    var body: some View {
        List {
            if account.user == nil {
                Text(account.isAvailable ? "Saved on this device. Sign in (Settings) to sync with shakeviewer.com."
                                         : "Saved on this device.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if model.bookmarks.isEmpty {
                ContentUnavailableView("No bookmarks", systemImage: "bookmark",
                                       description: Text("Swipe a quake in the list or tap Bookmark in its details."))
            }
            ForEach(model.bookmarks) { b in
                Button { model.selected = b.asQuake } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        QuakeRow(quake: b.asQuake)
                        if !b.note.isEmpty { Text(b.note).font(.caption).foregroundStyle(.secondary) }
                    }
                }
                .buttonStyle(.plain)
            }
            .onDelete { idx in
                let items = idx.map { model.bookmarks[$0] }
                items.forEach(model.removeBookmark)
            }
        }
        .readableListWidth()
        .navigationTitle("Bookmarks")
    }
}
