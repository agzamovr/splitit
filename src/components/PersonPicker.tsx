import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatMembers, getKnownPeople, saveKnownPerson, type ChatMember, type KnownPerson } from "../api";
import { memberKeys, peopleKeys } from "../queryKeys";

interface PersonPickerProps {
  existingTelegramIds: Set<number>;
  existingNames: Set<string>; // lowercase names of custom-named people already in bill
  onAdd: (init: { name: string; telegramId?: number; photoUrl?: string }) => void;
  onClose: () => void;
}

function MemberAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        onError={() => setImgFailed(true)}
        alt={name}
        className="flex-shrink-0 w-9 h-9 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-sm">
      {name ? name[0].toUpperCase() : "?"}
    </div>
  );
}

interface MemberWithPhoto extends ChatMember {
  photoUrl?: string;
}

function memberFullName(m: MemberWithPhoto | ChatMember): string {
  return [m.first_name, m.last_name].filter(Boolean).join(" ");
}

function SectionHeader({ label }: { label: string }) {
  return (
    <li className="px-4 pt-3 pb-1">
      <span className="text-xs font-medium text-espresso/40 uppercase tracking-wider">{label}</span>
    </li>
  );
}

function MemberRow({
  name,
  photoUrl,
  username,
  isAdded,
  onClick,
}: {
  name: string;
  photoUrl?: string;
  username?: string;
  isAdded: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={isAdded}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isAdded
            ? "opacity-40 cursor-default"
            : "hover:bg-cream-dark/40 active:bg-cream-dark/60"
        }`}
      >
        <MemberAvatar name={name} photoUrl={photoUrl} />
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-sm font-medium text-espresso truncate">{name}</div>
          {username && (
            <div className="text-xs text-espresso/40 truncate">@{username}</div>
          )}
        </div>
        {isAdded && (
          <span className="flex-shrink-0 text-xs text-espresso/40 font-medium">Added</span>
        )}
      </button>
    </li>
  );
}

export function PersonPicker({ existingTelegramIds, existingNames, onAdd, onClose }: PersonPickerProps) {
  const [inputText, setInputText] = useState("");
  const queryClient = useQueryClient();

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const hasChatContext = !!window.Telegram?.WebApp?.initDataUnsafe?.chat;
  const isTelegram = !!window.Telegram?.WebApp?.initData;

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: memberKeys.chat(),
    queryFn: getChatMembers,
    enabled: hasChatContext,
  });

  const { data: knownData } = useQuery({
    queryKey: peopleKeys.known(),
    queryFn: getKnownPeople,
    enabled: isTelegram,
  });

  const saveMutation = useMutation({
    mutationFn: saveKnownPerson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.known() }),
  });

  const knownPeople: KnownPerson[] = knownData?.people ?? [];

  const adminMembers: ChatMember[] = membersData?.members ?? [];

  const allMembers: MemberWithPhoto[] = tgUser
    ? [
        {
          id: tgUser.id,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
          username: tgUser.username,
          photoUrl: tgUser.photo_url,
        },
        ...adminMembers.filter(m => m.id !== tgUser.id),
      ]
    : adminMembers;

  // Known people NOT already in the Telegram member list → show as "Suggested"
  const allMemberIds = new Set(allMembers.map(m => m.id));
  const suggestedPeople: KnownPerson[] = knownPeople.filter(p =>
    p.telegramId != null
      ? !allMemberIds.has(p.telegramId)
      : true // custom-named people are always suggested
  );

  const query = inputText.toLowerCase();

  const filteredSuggested = suggestedPeople.filter(p => {
    if (!query) return true;
    return p.name.toLowerCase().includes(query);
  });

  const filteredMembers = allMembers.filter(m => {
    if (!query) return true;
    const fullName = memberFullName(m).toLowerCase();
    const uname = (m.username ?? "").toLowerCase();
    return fullName.includes(query) || uname.includes(query);
  });

  const showSections = filteredSuggested.length > 0 && filteredMembers.length > 0;

  // "Add custom" row: show when input doesn't match any visible name
  const inputTrimmed = inputText.trim();
  const inputMatchesSuggested = filteredSuggested.some(
    p => p.name.toLowerCase() === query
  );
  const inputMatchesMember = filteredMembers.some(
    m => memberFullName(m).toLowerCase() === query
  );
  const showAddCustom = inputTrimmed.length > 0 && !inputMatchesSuggested && !inputMatchesMember;

  const handleSelectMember = (member: MemberWithPhoto) => {
    if (existingTelegramIds.has(member.id)) return;
    const name = memberFullName(member);
    const photoUrl = tgUser?.id === member.id ? tgUser.photo_url : undefined;
    saveMutation.mutate({ name, telegramId: member.id, photoUrl });
    onAdd({ name, telegramId: member.id, photoUrl });
  };

  const handleSelectKnown = (person: KnownPerson) => {
    if (person.telegramId != null && existingTelegramIds.has(person.telegramId)) return;
    if (person.telegramId == null && existingNames.has(person.name.toLowerCase())) return;
    saveMutation.mutate(person); // bumps to top of recency
    onAdd({ name: person.name, telegramId: person.telegramId, photoUrl: person.photoUrl });
  };

  const handleAddCustom = () => {
    if (!inputTrimmed) return;
    saveMutation.mutate({ name: inputTrimmed });
    onAdd({ name: inputTrimmed });
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (showAddCustom) {
        handleAddCustom();
      } else if (filteredSuggested.length === 1 && filteredMembers.length === 0) {
        handleSelectKnown(filteredSuggested[0]);
      } else if (filteredMembers.length === 1 && filteredSuggested.length === 0) {
        handleSelectMember(filteredMembers[0]);
      }
    }
  };

  const showList = allMembers.length > 0 || suggestedPeople.length > 0 || (hasChatContext && membersLoading);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-espresso/20" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-cream rounded-t-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-espresso/20" />
        </div>

        {/* Search input */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.6 10.6z" />
            </svg>
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={showList ? "Search or enter a name…" : "Enter a name…"}
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-cream-dark/50 border border-espresso/10 rounded-xl text-base sm:text-sm text-espresso placeholder:text-espresso/30 outline-none focus:border-espresso/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 pb-safe">
          {hasChatContext && membersLoading && !membersData && suggestedPeople.length === 0 ? (
            // Skeleton (only while loading with no data to show yet)
            <ul className="divide-y divide-espresso/8">
              {[0, 1, 2].map(i => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-espresso/10 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-espresso/10 rounded animate-pulse" />
                    <div className="h-2.5 w-16 bg-espresso/8 rounded animate-pulse" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-espresso/8">
              {/* Suggested section */}
              {filteredSuggested.length > 0 && (
                <>
                  {showSections && <SectionHeader label="Suggested" />}
                  {filteredSuggested.map(person => {
                    const isAdded =
                      person.telegramId != null
                        ? existingTelegramIds.has(person.telegramId)
                        : existingNames.has(person.name.toLowerCase());
                    return (
                      <MemberRow
                        key={person.telegramId != null ? `tg-${person.telegramId}` : `name-${person.name}`}
                        name={person.name}
                        photoUrl={person.photoUrl}
                        isAdded={isAdded}
                        onClick={() => handleSelectKnown(person)}
                      />
                    );
                  })}
                </>
              )}

              {/* Group members section */}
              {filteredMembers.length > 0 && (
                <>
                  {showSections && <SectionHeader label="Group" />}
                  {filteredMembers.map(member => {
                    const isAdded = existingTelegramIds.has(member.id);
                    return (
                      <MemberRow
                        key={member.id}
                        name={memberFullName(member)}
                        photoUrl={member.photoUrl}
                        username={member.username}
                        isAdded={isAdded}
                        onClick={() => handleSelectMember(member)}
                      />
                    );
                  })}
                </>
              )}

              {/* Custom name row */}
              {showAddCustom && (
                <li>
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cream-dark/40 active:bg-cream-dark/60 transition-colors"
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-terracotta/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-base sm:text-sm font-medium text-terracotta">
                      Add "{inputTrimmed}"
                    </span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Done button */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-espresso/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-button text-button-text font-semibold text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
